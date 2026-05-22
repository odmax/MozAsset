import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';
import { readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

async function getAdmin() {
  const session = getSimpleAdminSession();
  if (!session) return null;
  return prisma.internalAdmin.findUnique({ where: { id: session.adminId } });
}

// GET /api/admin/backups/[id] — download a backup file
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await getAdmin();
    if (!admin || !hasPermission(admin, 'backups:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const backup = await prisma.backup.findUnique({ where: { id: params.id } });
    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    if (backup.status !== 'SUCCESS' || !backup.filePath) {
      return NextResponse.json({ error: 'Backup not available for download' }, { status: 400 });
    }

    // Try local file first
    if (existsSync(backup.filePath)) {
      const data = await readFile(backup.filePath);
      return new NextResponse(data, {
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Disposition': `attachment; filename="${backup.id}.sql.gz"`,
          'Content-Length': data.length.toString(),
        },
      });
    }

    // Try remote storage
    const { getBackupStorageProvider } = await import('@/lib/backup-storage');
    const provider = getBackupStorageProvider();
    const tmpPath = await provider.download(backup.id, backup.filePath);
    const data = await readFile(tmpPath);
    await unlink(tmpPath).catch(() => {});

    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${backup.id}.sql.gz"`,
        'Content-Length': data.length.toString(),
      },
    });
  } catch (error) {
    console.error('Download backup error:', error);
    return NextResponse.json({ error: 'Failed to download backup' }, { status: 500 });
  }
}

// DELETE /api/admin/backups/[id] — delete a backup record and file
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await getAdmin();
    if (!admin || !hasPermission(admin, 'backups:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const backup = await prisma.backup.findUnique({ where: { id: params.id } });
    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    // Delete file from storage if exists
    if (backup.filePath) {
      try {
        if (existsSync(backup.filePath)) {
          await unlink(backup.filePath);
        } else {
          const { getBackupStorageProvider } = await import('@/lib/backup-storage');
          const provider = getBackupStorageProvider();
          await provider.delete(backup.id, backup.filePath);
        }
      } catch { /* file deletion is best-effort */ }
    }

    await prisma.backup.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete backup error:', error);
    return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 });
  }
}
