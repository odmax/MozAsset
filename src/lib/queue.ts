import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_TOKEN || '',
});

// Queue keys
const PREFIX = 'queue:';
const KEYS = {
  pending: (q: string) => `${PREFIX}${q}:pending`,
  active: (q: string) => `${PREFIX}${q}:active`,
  failed: (q: string) => `${PREFIX}${q}:failed`,
  delayed: (q: string) => `${PREFIX}${q}:delayed`,
  dead: (q: string) => `${PREFIX}${q}:dead`,
  job: (q: string, id: string) => `${PREFIX}${q}:job:${id}`,
  stats: (q: string) => `${PREFIX}${q}:stats`,
  scheduled: () => `${PREFIX}scheduled`,
  processing: () => `${PREFIX}processing`,
} as const;

export interface JobPayload {
  type: string;
  data: Record<string, unknown>;
  organizationId?: string;
  userId?: string;
}

export interface Job extends JobPayload {
  id: string;
  queue: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'dead' | 'delayed';
  retries: number;
  maxRetries: number;
  delayUntil?: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  failedAt?: number;
  error?: string;
  nextRetryAt?: number;
}

export interface QueueStats {
  queue: string;
  pending: number;
  active: number;
  failed: number;
  delayed: number;
  dead: number;
  completed: number;
  processingTime: number[];
}

const QUEUES = ['email', 'notification', 'export', 'file', 'billing', 'maintenance'] as const;
export type QueueName = (typeof QUEUES)[number];

const RETRY_DELAYS = [1_000, 5_000, 15_000, 60_000, 300_000, 900_000]; // 1s, 5s, 15s, 1m, 5m, 15m
const MAX_RETRIES = 5;
const MAX_CONCURRENCY = 3;
const CLAIM_TIMEOUT = 120_000; // 2 minutes
const CLEANUP_INTERVAL = 3600; // 1 hour in seconds

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function addJob(
  queue: QueueName,
  type: string,
  data: Record<string, unknown>,
  options?: {
    delayMs?: number;
    organizationId?: string;
    userId?: string;
    maxRetries?: number;
  }
): Promise<string> {
  const id = generateId();
  const job: Job = {
    id,
    queue,
    type,
    data,
    organizationId: options?.organizationId,
    userId: options?.userId,
    status: 'pending',
    retries: 0,
    maxRetries: options?.maxRetries ?? MAX_RETRIES,
    createdAt: Date.now(),
  };

  await redis.hset(KEYS.job(queue, id), job as unknown as Record<string, unknown>);

  if (options?.delayMs && options.delayMs > 0) {
    job.status = 'delayed';
    job.delayUntil = Date.now() + options.delayMs;
    await redis.hset(KEYS.job(queue, id), { status: 'delayed', delayUntil: job.delayUntil });
    await redis.zadd(KEYS.delayed(queue), {
      score: job.delayUntil,
      member: id,
    });
  } else {
    await redis.lpush(KEYS.pending(queue), id);
  }

  await incrStat(queue, 'added');
  return id;
}

export async function processQueue(queue: QueueName, batchSize = MAX_CONCURRENCY): Promise<number> {
  const processing = new Set<string>();

  for (let i = 0; i < batchSize; i++) {
    const id = await redis.rpop(KEYS.pending(queue));
    if (!id) break;
    await redis.lpush(KEYS.active(queue), id);
    processing.add(id);
  }

  // Also move expired delayed jobs to pending
  await moveDelayedToPending(queue);

  if (processing.size === 0) return 0;

  let completed = 0;
  const procArr = Array.from(processing);
  for (let i = 0; i < procArr.length; i++) {
    const id = procArr[i];
    try {
      const job = await redis.hgetall(KEYS.job(queue, id)) as unknown as Job | null;
      if (!job) {
        await redis.lrem(KEYS.active(queue), 0, id);
        continue;
      }

      job.startedAt = Date.now();
      await redis.hset(KEYS.job(queue, id), { status: 'active', startedAt: job.startedAt } as Record<string, unknown>);

      await handleJob(queue, id, job);
      completed++;
    } catch (error: any) {
      completed++;
    }
  }

  return completed;
}

async function moveDelayedToPending(queue: QueueName): Promise<void> {
  const now = Date.now();
  const due = await redis.zrange(KEYS.delayed(queue), 0, now, { byScore: true });
  if (due.length > 0) {
    for (const id of due) {
      await redis.lpush(KEYS.pending(queue), id);
      await redis.hset(KEYS.job(queue, id as string), { status: 'pending', delayUntil: null });
    }
    await redis.zremrangebyscore(KEYS.delayed(queue), 0, now);
  }
}

async function handleJob(queue: QueueName, id: string, job: Job): Promise<void> {
  const handler = jobHandlers[job.type];
  if (!handler) {
    await failJob(queue, id, `No handler for job type: ${job.type}`);
    return;
  }

  try {
    await handler(job.data);
    await completeJob(queue, id);
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    job.retries++;

    if (job.retries >= job.maxRetries) {
      await deadLetterJob(queue, id, errorMessage);
    } else {
      const delay = RETRY_DELAYS[Math.min(job.retries - 1, RETRY_DELAYS.length - 1)];
      const nextRetryAt = Date.now() + delay;
      await redis.hset(KEYS.job(queue, id), {
        status: 'delayed',
        retries: job.retries,
        error: errorMessage,
        failedAt: Date.now(),
        nextRetryAt,
      });
      await redis.zadd(KEYS.delayed(queue), { score: nextRetryAt, member: id });
      await redis.lrem(KEYS.active(queue), 0, id);
    }
  }
}

async function completeJob(queue: QueueName, id: string): Promise<void> {
  const now = Date.now();
  await redis.hset(KEYS.job(queue, id), {
    status: 'completed',
    completedAt: now,
  });
  await redis.lrem(KEYS.active(queue), 0, id);
  await incrStat(queue, 'completed');
  logProcessingTime(queue, now - (await getJobStart(queue, id)));
}

async function failJob(queue: QueueName, id: string, error: string): Promise<void> {
  await redis.hset(KEYS.job(queue, id), {
    status: 'failed',
    error,
    failedAt: Date.now(),
  });
  await redis.lrem(KEYS.active(queue), 0, id);
  await redis.lpush(KEYS.failed(queue), id);
  await incrStat(queue, 'failed');
}

async function deadLetterJob(queue: QueueName, id: string, error: string): Promise<void> {
  await redis.hset(KEYS.job(queue, id), {
    status: 'dead',
    error,
    failedAt: Date.now(),
    nextRetryAt: null,
  });
  await redis.lrem(KEYS.active(queue), 0, id);
  await redis.lpush(KEYS.dead(queue), id);
  await incrStat(queue, 'dead');
}

async function getJobStart(queue: QueueName, id: string): Promise<number> {
  const job = await redis.hgetall(KEYS.job(queue, id)) as unknown as Job | null;
  return job?.startedAt || Date.now();
}

export async function retryJob(queue: QueueName, id: string): Promise<boolean> {
  const job = await redis.hgetall(KEYS.job(queue, id)) as unknown as Job | null;
  if (!job || (job.status !== 'failed' && job.status !== 'dead')) return false;

  await redis.hset(KEYS.job(queue, id), {
    status: 'pending',
    retries: 0,
    error: null,
    failedAt: null,
    nextRetryAt: null,
  });
  await redis.lrem(KEYS.failed(queue), 0, id);
  await redis.lrem(KEYS.dead(queue), 0, id);
  await redis.lpush(KEYS.pending(queue), id);
  return true;
}

export async function retryAllFailed(queue: QueueName): Promise<number> {
  const failed = await redis.lrange(KEYS.failed(queue), 0, -1);
  let count = 0;
  for (const id of failed) {
    if (await retryJob(queue, id as string)) count++;
  }
  const dead = await redis.lrange(KEYS.dead(queue), 0, -1);
  for (const id of dead) {
    if (await retryJob(queue, id as string)) count++;
  }
  return count;
}

export async function getQueueJobs(
  queue: QueueName,
  status: Job['status'] | 'all' = 'all',
  page = 1,
  limit = 20
): Promise<{ jobs: Job[]; total: number }> {
  const listKey =
    status === 'all' ? null
    : status === 'failed' ? KEYS.failed(queue)
    : status === 'dead' ? KEYS.dead(queue)
    : status === 'active' ? KEYS.active(queue)
    : status === 'delayed' ? KEYS.delayed(queue)
    : KEYS.pending(queue);

  if (!listKey) {
    // Return all statuses merged
    const allIds = await redis.lrange(KEYS.pending(queue), 0, -1) as string[];
    const activeIds = await redis.lrange(KEYS.active(queue), 0, -1) as string[];
    const failedIds = await redis.lrange(KEYS.failed(queue), 0, -1) as string[];
    const deadIds = await redis.lrange(KEYS.dead(queue), 0, -1) as string[];
    const delayedIds = await redis.zrange(KEYS.delayed(queue), 0, -1) as string[];
    const combined = allIds.concat(activeIds, failedIds, deadIds, delayedIds);
    const unique = Array.from(new Set(combined));
    const total = unique.length;
    const pageIds = unique.slice((page - 1) * limit, page * limit);
    const jobs: Job[] = [];
    for (const id of pageIds) {
      const job = await redis.hgetall(KEYS.job(queue, id as string)) as unknown as Job | null;
      if (job) jobs.push(job);
    }
    return { jobs, total };
  }

  const isSorted = status === 'delayed';
  const ids = isSorted ? await redis.zrange(listKey, 0, -1) : await redis.lrange(listKey, 0, -1);
  const total = ids.length;
  const pageIds = ids.slice((page - 1) * limit, page * limit);
  const jobs: Job[] = [];
  for (const id of pageIds) {
    const job = await redis.hgetall(KEYS.job(queue, id as string)) as unknown as Job | null;
    if (job) jobs.push(job);
  }
  return { jobs, total };
}

export async function getQueueStats(queue: QueueName): Promise<QueueStats> {
  const [pending, active, failed, dead, delayed, stats] = await Promise.all([
    redis.llen(KEYS.pending(queue)),
    redis.llen(KEYS.active(queue)),
    redis.llen(KEYS.failed(queue)),
    redis.llen(KEYS.dead(queue)),
    redis.zcard(KEYS.delayed(queue)),
    redis.hgetall(KEYS.stats(queue)),
  ]);

  const s = (stats as Record<string, string>) || {};
  return {
    queue,
    pending,
    active,
    failed,
    dead,
    delayed,
    completed: parseInt(s.completed || '0'),
    processingTime: (s.times || '').split(',').filter(Boolean).map(Number).slice(-100),
  };
}

export async function getAllQueueStats(): Promise<QueueStats[]> {
  const results = await Promise.all(QUEUES.map((q) => getQueueStats(q)));
  return results;
}

async function incrStat(queue: QueueName, field: string): Promise<void> {
  await redis.hincrby(KEYS.stats(queue), field, 1);
}

async function logProcessingTime(queue: QueueName, ms: number): Promise<void> {
  const key = `times`;
  const current = (await redis.hget(KEYS.stats(queue), key)) as string || '';
  const times = current.split(',').filter(Boolean).concat(String(ms)).slice(-100).join(',');
  await redis.hset(KEYS.stats(queue), { [key]: times });
}

export async function cleanupStuckJobs(): Promise<number> {
  let cleaned = 0;
  const now = Date.now();

  for (const queue of QUEUES) {
    const activeIds = await redis.lrange(KEYS.active(queue), 0, -1);
    for (const id of activeIds) {
      const job = await redis.hgetall(KEYS.job(queue, id as string)) as unknown as Job | null;
      if (job && job.startedAt && now - job.startedAt > CLAIM_TIMEOUT) {
        await failJob(queue, id as string, 'Job timed out (stuck)');
        cleaned++;
      }
    }
  }

  return cleaned;
}

export async function cleanupOldJobs(maxAgeDays = 7): Promise<number> {
  let removed = 0;
  const cutoff = Date.now() - maxAgeDays * 86400000;

  for (const queue of QUEUES) {
    const allJobs = await redis.keys(`${PREFIX}${queue}:job:*`);
    for (const key of allJobs) {
      const job = await redis.hgetall(key) as unknown as Job | null;
      if (job && job.createdAt < cutoff && (job.status === 'completed' || job.status === 'dead')) {
        await redis.del(key);
        removed++;
      }
    }
  }

  return removed;
}

export async function processAllQueues(): Promise<Record<QueueName, number>> {
  const results: Record<string, number> = {};
  for (const queue of QUEUES) {
    results[queue] = await processQueue(queue);
  }
  return results as Record<QueueName, number>;
}

export async function getJob(queue: QueueName, id: string): Promise<Job | null> {
  return (await redis.hgetall(KEYS.job(queue, id))) as unknown as Job | null;
}

// Job handlers registry
type JobHandler = (data: Record<string, unknown>) => Promise<void>;
const jobHandlers: Record<string, JobHandler> = {};

export function registerJobHandler(type: string, handler: JobHandler): void {
  jobHandlers[type] = handler;
}

export function getRegisteredHandlers(): string[] {
  return Object.keys(jobHandlers);
}

export { QUEUES };
