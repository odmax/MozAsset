import { createWriteStream, createReadStream, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { writeFile, readFile, unlink, readdir, stat } from 'fs/promises';

export type StorageBackend = 'local' | 's3' | 'backblaze';

export interface BackupStorageResult {
  filePath: string;
  fileSize: number;
  md5Hash?: string;
  storageBackend: StorageBackend;
}

export interface BackupStorageProvider {
  upload(localPath: string, backupId: string): Promise<BackupStorageResult>;
  download(backupId: string, storagePath: string): Promise<string>;
  delete(backupId: string, storagePath: string): Promise<void>;
  list(): Promise<{ id: string; path: string; size: number; modified: Date }[]>;
}

class LocalStorageProvider implements BackupStorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = process.env.BACKUP_LOCAL_DIR || resolve(process.cwd(), 'backups');
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(localPath: string, backupId: string): Promise<BackupStorageResult> {
    const destPath = join(this.baseDir, `${backupId}.sql.gz`);
    const data = await readFile(localPath);
    await writeFile(destPath, data);
    const fileSize = (await stat(destPath)).size;
    return { filePath: destPath, fileSize, storageBackend: 'local' };
  }

  async download(backupId: string, _storagePath: string): Promise<string> {
    const srcPath = join(this.baseDir, `${backupId}.sql.gz`);
    const tmpPath = join(this.baseDir, `restore-${backupId}.sql.gz`);
    const data = await readFile(srcPath);
    await writeFile(tmpPath, data);
    return tmpPath;
  }

  async delete(backupId: string, _storagePath: string): Promise<void> {
    const path = join(this.baseDir, `${backupId}.sql.gz`);
    if (existsSync(path)) await unlink(path);
  }

  async list(): Promise<{ id: string; path: string; size: number; modified: Date }[]> {
    const entries = await readdir(this.baseDir);
    const results: { id: string; path: string; size: number; modified: Date }[] = [];
    for (const entry of entries) {
      if (!entry.endsWith('.sql.gz')) continue;
      const fullPath = join(this.baseDir, entry);
      const s = await stat(fullPath);
      results.push({ id: entry.replace('.sql.gz', ''), path: fullPath, size: s.size, modified: s.mtime });
    }
    return results;
  }
}

class S3StorageProvider implements BackupStorageProvider {
  async upload(localPath: string, backupId: string): Promise<BackupStorageResult> {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const bucket = process.env.BACKUP_S3_BUCKET || 'mozassets-backups';
    const region = process.env.BACKUP_S3_REGION || 'us-east-1';
    const key = `backups/${backupId}.sql.gz`;

    const client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.BACKUP_S3_ACCESS_KEY || '',
        secretAccessKey: process.env.BACKUP_S3_SECRET_KEY || '',
      },
    });

    const data = await readFile(localPath);
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data }));

    return { filePath: `s3://${bucket}/${key}`, fileSize: data.length, storageBackend: 's3' };
  }

  async download(backupId: string, storagePath: string): Promise<string> {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const tmpPath = join(process.cwd(), 'backups', `restore-${backupId}.sql.gz`);
    const parts = storagePath.replace('s3://', '').split('/');
    const bucket = parts[0];
    const key = parts.slice(1).join('/');

    const client = new S3Client({
      region: process.env.BACKUP_S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.BACKUP_S3_ACCESS_KEY || '',
        secretAccessKey: process.env.BACKUP_S3_SECRET_KEY || '',
      },
    });

    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = await result.Body?.transformToByteArray() || new Uint8Array();
    await writeFile(tmpPath, Buffer.from(body));
    return tmpPath;
  }

  async delete(backupId: string, storagePath: string): Promise<void> {
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const parts = storagePath.replace('s3://', '').split('/');
    const bucket = parts[0];
    const key = parts.slice(1).join('/');

    const client = new S3Client({
      region: process.env.BACKUP_S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.BACKUP_S3_ACCESS_KEY || '',
        secretAccessKey: process.env.BACKUP_S3_SECRET_KEY || '',
      },
    });

    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async list(): Promise<{ id: string; path: string; size: number; modified: Date }[]> {
    const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const bucket = process.env.BACKUP_S3_BUCKET || 'mozassets-backups';
    const region = process.env.BACKUP_S3_REGION || 'us-east-1';

    const client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.BACKUP_S3_ACCESS_KEY || '',
        secretAccessKey: process.env.BACKUP_S3_SECRET_KEY || '',
      },
    });

    const result = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'backups/' }));
    return (result.Contents || [])
      .filter((obj: any) => obj.Key?.endsWith('.sql.gz'))
      .map((obj: any) => ({
        id: (obj.Key || '').replace('backups/', '').replace('.sql.gz', ''),
        path: `s3://${bucket}/${obj.Key}`,
        size: obj.Size || 0,
        modified: obj.LastModified || new Date(),
      }));
  }
}

class BackblazeStorageProvider implements BackupStorageProvider {
  async upload(localPath: string, backupId: string): Promise<BackupStorageResult> {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const bucket = process.env.BACKUP_B2_BUCKET || 'mozassets-backups';
    const endpoint = process.env.BACKUP_B2_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com';
    const key = `backups/${backupId}.sql.gz`;

    const client = new S3Client({
      region: process.env.BACKUP_B2_REGION || 'us-west-004',
      endpoint,
      credentials: {
        accessKeyId: process.env.BACKUP_B2_ACCESS_KEY || '',
        secretAccessKey: process.env.BACKUP_B2_SECRET_KEY || '',
      },
    });

    const data = await readFile(localPath);
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data }));

    const storagePath = `b2://${bucket}/${key}`;
    return { filePath: storagePath, fileSize: data.length, storageBackend: 'backblaze' };
  }

  async download(backupId: string, storagePath: string): Promise<string> {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const tmpPath = join(process.cwd(), 'backups', `restore-${backupId}.sql.gz`);
    const bucket = process.env.BACKUP_B2_BUCKET || 'mozassets-backups';
    const key = `backups/${backupId}.sql.gz`;

    const client = new S3Client({
      region: process.env.BACKUP_B2_REGION || 'us-west-004',
      endpoint: process.env.BACKUP_B2_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com',
      credentials: {
        accessKeyId: process.env.BACKUP_B2_ACCESS_KEY || '',
        secretAccessKey: process.env.BACKUP_B2_SECRET_KEY || '',
      },
    });

    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = await result.Body?.transformToByteArray() || new Uint8Array();
    await writeFile(tmpPath, Buffer.from(body));
    return tmpPath;
  }

  async delete(backupId: string, _storagePath: string): Promise<void> {
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const bucket = process.env.BACKUP_B2_BUCKET || 'mozassets-backups';
    const key = `backups/${backupId}.sql.gz`;

    const client = new S3Client({
      region: process.env.BACKUP_B2_REGION || 'us-west-004',
      endpoint: process.env.BACKUP_B2_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com',
      credentials: {
        accessKeyId: process.env.BACKUP_B2_ACCESS_KEY || '',
        secretAccessKey: process.env.BACKUP_B2_SECRET_KEY || '',
      },
    });

    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async list(): Promise<{ id: string; path: string; size: number; modified: Date }[]> {
    const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const bucket = process.env.BACKUP_B2_BUCKET || 'mozassets-backups';

    const client = new S3Client({
      region: process.env.BACKUP_B2_REGION || 'us-west-004',
      endpoint: process.env.BACKUP_B2_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com',
      credentials: {
        accessKeyId: process.env.BACKUP_B2_ACCESS_KEY || '',
        secretAccessKey: process.env.BACKUP_B2_SECRET_KEY || '',
      },
    });

    const result = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'backups/' }));
    return (result.Contents || [])
      .filter((obj: any) => obj.Key?.endsWith('.sql.gz'))
      .map((obj: any) => ({
        id: (obj.Key || '').replace('backups/', '').replace('.sql.gz', ''),
        path: `b2://${bucket}/${obj.Key}`,
        size: obj.Size || 0,
        modified: obj.LastModified || new Date(),
      }));
  }
}

export function getBackupStorageProvider(): BackupStorageProvider {
  const backend = (process.env.BACKUP_STORAGE || 'local').toLowerCase();
  switch (backend) {
    case 's3':
      return new S3StorageProvider();
    case 'backblaze':
      return new BackblazeStorageProvider();
    default:
      return new LocalStorageProvider();
  }
}

export function getStorageBackend(): StorageBackend {
  return (process.env.BACKUP_STORAGE || 'local').toLowerCase() as StorageBackend;
}
