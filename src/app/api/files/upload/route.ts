import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/user-context';
import { uploadFile, validateFile } from '@/lib/storage';
import { uploadLimiter } from '@/lib/rate-limiter';
import { sanitizePlainText } from '@/lib/security';

export const dynamic = 'force-dynamic';

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIp(request);
    const uploadCheck = uploadLimiter.check(`user:${context.userId}`);
    if (!uploadCheck.allowed) {
      return NextResponse.json({ error: 'Upload rate limit exceeded', retryAfter: uploadCheck.retryAfter }, { status: 429 });
    }

    const formData = await request.formData();
    const fileField = formData.get('file');
    if (!fileField || !(fileField instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileType = sanitizePlainText((formData.get('type') as string) || 'OTHER');
    const assetId = (formData.get('assetId') as string) || undefined;
    const maintenanceId = (formData.get('maintenanceId') as string) || undefined;
    const supportTicketId = (formData.get('supportTicketId') as string) || undefined;
    const replaceId = (formData.get('replaceId') as string) || undefined;

    const validTypes = ['ASSET_IMAGE', 'INVOICE', 'WARRANTY_DOC', 'MAINTENANCE_RECEIPT', 'MANUAL', 'SUPPORT_ATTACHMENT', 'OTHER'];
    if (!validTypes.includes(fileType)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    validateFile({ name: fileField.name, size: fileField.size, type: fileField.type });

    // For asset images, validate it's actually an image
    if (fileType === 'ASSET_IMAGE' && !fileField.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Asset images must be image files' }, { status: 400 });
    }

    const buffer = Buffer.from(await fileField.arrayBuffer());

    // If replacing, delete old file first
    if (replaceId) {
      const oldFile = await prisma.file.findFirst({
        where: { id: replaceId, organizationId: context.organizationId },
      });
      if (oldFile) {
        const { deleteFile } = await import('@/lib/storage');
        const publicId = oldFile.url.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '');
        await deleteFile(publicId);
        await prisma.file.delete({ where: { id: oldFile.id } });
      }
    }

    const result = await uploadFile(buffer, fileField.name, fileField.type, {
      folder: `mozassets/${context.organizationId || 'personal'}/${fileType.toLowerCase()}`,
    });

    const file = await prisma.file.create({
      data: {
        organizationId: context.organizationId,
        uploadedById: context.userId,
        assetId,
        maintenanceId,
        supportTicketId,
        type: fileType as any,
        fileName: result.fileName,
        originalName: sanitizePlainText(fileField.name),
        mimeType: result.mimeType,
        size: result.size,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        metadata: {
          originalName: fileField.name,
          uploadIp: ip,
          userAgent: request.headers.get('user-agent') || '',
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'File',
        entityId: file.id,
        userId: context.userId,
        metadata: { fileName: fileField.name, fileType, size: result.size },
        ipAddress: ip,
      } as any,
    });

    return NextResponse.json({ success: true, file }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'FileValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
