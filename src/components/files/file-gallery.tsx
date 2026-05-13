'use client';

import { useState } from 'react';
import {
  File, Image, FileText, Download, Trash2, ZoomIn, X, AlertCircle,
} from 'lucide-react';

export interface FileItem {
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

interface FileGalleryProps {
  files: FileItem[];
  onDelete?: (id: string) => void;
  readonly?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function getFileIcon(mimeType: string, type: string) {
  if (mimeType.startsWith('image/') || type === 'ASSET_IMAGE') return Image;
  if (mimeType === 'application/pdf') return FileText;
  return File;
}

export default function FileGallery({ files, onDelete, readonly }: FileGalleryProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <File className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No files uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
        {files.map((file) => {
          const Icon = getFileIcon(file.mimeType, file.type);
          const isImage = file.mimeType.startsWith('image/');
          return (
            <div
              key={file.id}
              className="group relative rounded-xl border bg-card overflow-hidden"
            >
              {isImage && file.thumbnailUrl ? (
                <button
                  onClick={() => setPreviewUrl(file.url)}
                  className="block w-full aspect-square overflow-hidden"
                >
                  <img
                    src={file.thumbnailUrl}
                    alt={file.originalName}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </button>
              ) : (
                <div className="flex items-center justify-center aspect-square bg-muted/30">
                  <Icon className="h-10 w-10 text-muted-foreground/60" />
                </div>
              )}

              <div className="p-2.5">
                <p className="text-xs font-medium truncate" title={file.originalName}>
                  {file.originalName}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatSize(file.size)} · {formatDate(file.createdAt)}
                </p>
              </div>

              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isImage && (
                  <button
                    onClick={() => setPreviewUrl(file.url)}
                    className="p-1.5 rounded-lg bg-background/90 border shadow-sm hover:bg-background"
                    title="Preview"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                )}
                <a
                  href={file.url}
                  download={file.originalName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-background/90 border shadow-sm hover:bg-background"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
                {!readonly && onDelete && (
                  <button
                    onClick={() => {
                      if (confirm('Delete this file?')) onDelete(file.id);
                    }}
                    className="p-1.5 rounded-lg bg-red-50/90 border border-red-200 shadow-sm hover:bg-red-100 text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
