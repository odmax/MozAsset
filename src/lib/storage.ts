import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
  'application/zip', 'application/x-rar-compressed',
]);

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf',
  'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'zip', 'rar',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  resourceType?: 'image' | 'raw' | 'auto';
  transformation?: Record<string, string | number>;
}

export interface UploadResult {
  url: string;
  thumbnailUrl: string | null;
  publicId: string;
  size: number;
  mimeType: string;
  fileName: string;
}

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
    .slice(0, 100);
}

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

export function validateFile(file: { name: string; size: number; type: string }, isImage?: boolean): void {
  const ext = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new FileValidationError(`File extension .${ext} is not allowed`);
  }
  if (!ALLOWED_MIME_TYPES.has(file.type) && !file.type.startsWith('image/')) {
    throw new FileValidationError(`File type ${file.type} is not allowed`);
  }
  const limit = isImage || file.type.startsWith('image/') ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  if (file.size > limit) {
    const mb = limit / 1024 / 1024;
    throw new FileValidationError(`File size exceeds ${mb}MB limit`);
  }
  if (file.size === 0) {
    throw new FileValidationError('File is empty');
  }
}

function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

export async function uploadFile(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const sanitized = sanitizeFileName(originalName);
  const folder = options.folder || 'mozassets';
  const isImage = isImageMime(mimeType);

  const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: options.publicId || sanitized.replace(/\.[^/.]+$/, ''),
        resource_type: options.resourceType || 'auto',
        use_filename: true,
        unique_filename: true,
        ...(isImage && {
          eager: [
            { width: 300, height: 300, crop: 'fill', gravity: 'auto', format: 'webp', quality: 'auto' },
            { width: 800, crop: 'limit', quality: 'auto', format: 'webp' },
          ],
          eager_async: false,
        }),
        ...options.transformation,
      },
      (error, result) => {
        if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        if (!result) return reject(new Error('Cloudinary upload returned empty result'));

        resolve({
          url: result.secure_url,
          thumbnailUrl: isImage
            ? cloudinary.url(result.public_id, {
                width: 300,
                height: 300,
                crop: 'fill',
                gravity: 'auto',
                format: 'webp',
                quality: 'auto',
              })
            : null,
          publicId: result.public_id,
          size: result.bytes,
          mimeType: result.resource_type === 'raw' ? mimeType : (result.format ? `image/${result.format}` : mimeType),
          fileName: result.public_id.split('/').pop() || sanitized,
        });
      }
    );
    uploadStream.end(fileBuffer);
  });

  return uploadPromise;
}

export async function deleteFile(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete failed:', error);
  }
}

export function getSignedUrl(publicId: string, options: { expiresIn?: number; attachment?: boolean } = {}): string {
  const { expiresIn = 3600, attachment } = options;
  return cloudinary.url(publicId, {
    sign_url: true,
    type: 'upload',
    resource_type: 'image',
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    ...(attachment && { flags: 'attachment' }),
  });
}

export function getOptimizedUrl(publicId: string, options: { width?: number; height?: number; quality?: string } = {}): string {
  return cloudinary.url(publicId, {
    width: options.width || 800,
    crop: 'limit',
    quality: options.quality || 'auto',
    format: 'auto',
    fetch_format: 'auto',
  });
}

export { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, MAX_FILE_SIZE, MAX_IMAGE_SIZE };
