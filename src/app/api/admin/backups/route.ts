import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';
import { getBackupStorageProvider, getStorageBackend } from '@/lib/backup-storage';

export const dynamic = 'force-dynamic';

const BACKUP_DIR = process.env.BACKUP_LOCAL_DIR || './backups';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);

function getAdmin() {
  const session = getSimpleAdminSession();
  if (!session) return null;
  return prisma.internalAdmin.findUnique({ where: { id: session.adminId } });
}

function formatBytes(bytes: number | bigint): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// GET /api/admin/backups — list all backups
export async function GET() {
  try {
    const admin = await getAdmin();
    if (!admin || !hasPermission(admin, 'backups:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const backups = await prisma.backup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formatted = backups.map((b) => ({
      id: b.id,
      status: b.status,
      storageBackend: b.storageBackend,
      filePath: b.filePath,
      fileSize: b.fileSize ? formatBytes(b.fileSize) : null,
      fileSizeBytes: b.fileSize ? Number(b.fileSize) : null,
      md5Hash: b.md5Hash,
      errorMessage: b.errorMessage,
      triggeredBy: b.triggeredBy,
      notes: b.notes,
      createdAt: b.createdAt,
      completedAt: b.completedAt,
    }));

    return NextResponse.json({ backups: formatted });
  } catch (error) {
    console.error('List backups error:', error);
    return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 });
  }
}

// POST /api/admin/backups — trigger a manual backup
export async function POST(request: Request) {
  try {
    const admin = await getAdmin();
    if (!admin || !hasPermission(admin, 'backups:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const notes = body.notes || '';

    const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
    const BACKUP_ID = `backup-${TIMESTAMP}`;

    // Create pending record
    const backup = await prisma.backup.create({
      data: {
        id: BACKUP_ID,
        status: 'PENDING',
        storageBackend: getStorageBackend().toUpperCase() as any,
        triggeredBy: admin.email,
        notes: notes || null,
      },
    });

    // Run backup asynchronously
    const { execSync } = await import('child_process');
    const { existsSync, mkdirSync, statSync } = await import('fs');
    const { join } = await import('path');
    const { createHash } = await import('crypto');

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      await prisma.backup.update({
        where: { id: BACKUP_ID },
        data: { status: 'FAILED', errorMessage: 'DATABASE_URL not set', completedAt: new Date() },
      });
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
    }

    const localDir = BACKUP_DIR;
    if (!existsSync(localDir)) {
      mkdirSync(localDir, { recursive: true });
    }

    const localPath = join(localDir, `${BACKUP_ID}.sql.gz`);

    try {
      const parsed = new URL(dbUrl);
      const dbName = parsed.pathname.replace('/', '');
      const dbHost = parsed.hostname;
      const dbPort = parsed.port || '5432';
      const dbUser = decodeURIComponent(parsed.username);
      const dbPass = decodeURIComponent(parsed.password);

      const dumpCmd = [
        `set PGPASSWORD=${dbPass} &&`,
        'pg_dump',
        `--host=${dbHost}`,
        `--port=${dbPort}`,
        `--username=${dbUser}`,
        `--dbname=${dbName}`,
        '--format=custom',
        '--compress=9',
        '--no-owner',
        '--no-acl',
        `--file=${localPath}`,
      ].join(' ');

      await prisma.backup.update({
        where: { id: BACKUP_ID },
        data: { status: 'RUNNING' },
      });

      execSync(dumpCmd, {
        env: { ...process.env, PGPASSWORD: dbPass },
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 300000,
      });

      if (!existsSync(localPath)) {
        throw new Error('pg_dump did not produce output file');
      }

      const fileSize = statSync(localPath).size;
      const md5Hash = createHash('md5').update(require('fs').readFileSync(localPath)).digest('hex');

      // Upload to remote storage if configured
      let storagePath = localPath;
      let storageBackend = getStorageBackend().toUpperCase();
      if (getStorageBackend() !== 'local') {
        try {
          const provider = getBackupStorageProvider();
          const result = await provider.upload(localPath, BACKUP_ID);
          storagePath = result.filePath;
          storageBackend = result.storageBackend.toUpperCase();
        } catch (uploadError: any) {
          console.error('Remote upload failed, keeping local:', uploadError.message);
        }
      }

      await prisma.backup.update({
        where: { id: BACKUP_ID },
        data: {
          status: 'SUCCESS',
          filePath: storagePath,
          fileSize: BigInt(fileSize),
          md5Hash: md5Hash,
          completedAt: new Date(),
        },
      });

      // Apply retention — delete old records beyond retention period
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
      await prisma.backup.deleteMany({
        where: { createdAt: { lt: cutoff }, status: 'SUCCESS' },
      });

      return NextResponse.json({
        success: true,
        backup: {
          id: BACKUP_ID,
          status: 'SUCCESS',
          fileSize: formatBytes(fileSize),
          fileSizeBytes: fileSize,
          md5Hash,
          storageBackend,
          filePath: storagePath,
          completedAt: new Date(),
        },
      });
    } catch (runError: any) {
      const errMsg = runError.stderr?.toString() || runError.message || 'Backup execution failed';
      await prisma.backup.update({
        where: { id: BACKUP_ID },
        data: { status: 'FAILED', errorMessage: errMsg, completedAt: new Date() },
      });

      // Send failure notification
      const notifyEmail = process.env.BACKUP_NOTIFICATION_EMAIL;
      if (notifyEmail) {
        try {
          const { sendEmail } = await import('@/lib/email');
          await sendEmail({
            to: notifyEmail,
            subject: `[MozAssets] Backup Failed — ${BACKUP_ID}`,
            html: `
              <h2>Database Backup Failed</h2>
              <p><strong>Backup ID:</strong> ${BACKUP_ID}</p>
              <p><strong>Error:</strong> ${errMsg}</p>
            `,
          });
        } catch { /* email error is non-fatal */ }
      }

      return NextResponse.json({ error: errMsg }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Failed to run backup' }, { status: 500 });
  }
}
