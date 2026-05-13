import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/user-context';
import { deleteFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const context = await getCurrentUserContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const file = await prisma.file.findFirst({
      where: {
        id: params.id,
        ...(context.isInternalAdmin ? {} : { organizationId: context.organizationId || 'never-match' }),
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const { url } = file;
    const publicId = url.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '');
    await deleteFile(publicId);

    await prisma.file.delete({ where: { id: file.id } });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'File',
        entityId: file.id,
        userId: context.userId,
        metadata: { fileName: file.originalName },
      } as any,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
