'use client';

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { Upload, X, File, Image, Loader2, AlertCircle, CheckCircle, FileText } from 'lucide-react';

export interface UploadedFile {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: string;
  createdAt: string;
}

interface UploadItem {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  result?: UploadedFile;
}

interface UploadDropzoneProps {
  onUploadComplete?: (files: UploadedFile[]) => void;
  accept?: string;
  maxFiles?: number;
  multiple?: boolean;
  fileType: string;
  assetId?: string;
  maintenanceId?: string;
  supportTicketId?: string;
  replaceId?: string;
  maxSizeMB?: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf') return FileText;
  return File;
}

export default function UploadDropzone({
  onUploadComplete,
  accept,
  maxFiles = 10,
  multiple = true,
  fileType,
  assetId,
  maintenanceId,
  supportTicketId,
  replaceId,
  maxSizeMB = 10,
}: UploadDropzoneProps) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: UploadItem[] = Array.from(files)
      .filter((f) => f.size <= maxSizeMB * 1024 * 1024)
      .map((f) => ({ file: f, status: 'pending' as const, progress: 0 }));
    setUploads((prev) => [...prev, ...newItems].slice(0, maxFiles));
  }, [maxFiles, maxSizeMB]);

  const uploadFileFn = useCallback(async (item: UploadItem) => {
    setUploads((prev) =>
      prev.map((u) => (u.file === item.file ? { ...u, status: 'uploading', progress: 0 } : u))
    );

    try {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('type', fileType);
      if (assetId) formData.append('assetId', assetId);
      if (maintenanceId) formData.append('maintenanceId', maintenanceId);
      if (supportTicketId) formData.append('supportTicketId', supportTicketId);
      if (replaceId) formData.append('replaceId', replaceId);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/files/upload');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploads((prev) =>
            prev.map((u) => (u.file === item.file ? { ...u, progress } : u))
          );
        }
      };

      const result = await new Promise<UploadedFile>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            resolve(data.file);
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.error || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      setUploads((prev) =>
        prev.map((u) =>
          u.file === item.file ? { ...u, status: 'done', progress: 100, result } : u
        )
      );

      return result;
    } catch (error: any) {
      setUploads((prev) =>
        prev.map((u) =>
          u.file === item.file ? { ...u, status: 'error', error: error.message } : u
        )
      );
      return null;
    }
  }, [fileType, assetId, maintenanceId, supportTicketId, replaceId]);

  const startUpload = useCallback(async () => {
    const results: UploadedFile[] = [];
    for (const item of uploads) {
      if (item.status === 'pending') {
        const result = await uploadFileFn(item);
        if (result) results.push(result);
      }
    }
    if (results.length > 0 && onUploadComplete) {
      onUploadComplete(results);
    }
  }, [uploads, uploadFileFn, onUploadComplete]);

  const removeItem = useCallback((file: File) => {
    setUploads((prev) => prev.filter((u) => u.file !== file));
  }, []);

  const retryItem = useCallback((item: UploadItem) => {
    setUploads((prev) =>
      prev.map((u) => (u.file === item.file ? { ...u, status: 'pending', progress: 0, error: undefined } : u))
    );
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const onInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  }, [addFiles]);

  return (
    <div className="space-y-3">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onInputChange}
          className="hidden"
        />
        <Upload className="h-8 w-8 text-muted-foreground/60 mb-3" />
        <p className="text-sm font-medium">
          {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Max {maxSizeMB}MB per file · {accept ? accept.split(',').join(', ') : 'All supported types'}
        </p>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((item, i) => {
            const Icon = getFileIcon(item.file.type);
            return (
              <div
                key={`${item.file.name}-${i}`}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                {item.result?.thumbnailUrl ? (
                  <img
                    src={item.result.thumbnailUrl}
                    alt=""
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(item.file.size)}</p>
                  {item.status === 'uploading' && (
                    <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.error && (
                    <p className="text-xs text-red-500 mt-1">{item.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {item.status === 'pending' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeItem(item.file); }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {item.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {item.status === 'done' && (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  )}
                  {item.status === 'error' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); retryItem(item); }}
                      className="p-1 rounded hover:bg-muted text-amber-500"
                      title="Retry"
                    >
                      <AlertCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setUploads([]);
              }}
              className="px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors"
            >
              Clear
            </button>
            <button
              onClick={startUpload}
              disabled={uploads.every((u) => u.status === 'done')}
              className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {uploads.some((u) => u.status === 'uploading') ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
