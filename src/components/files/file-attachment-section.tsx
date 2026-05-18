'use client';

import { useState, useEffect, useCallback } from 'react';
import { Cloud, HardDrive } from 'lucide-react';
import FileGallery, { type FileItem } from './file-gallery';
import UploadDropzone, { type UploadedFile } from './upload-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStorageLimit } from '@/lib/billing';
import type { Plan } from '@prisma/client';

interface FileAttachmentSectionProps {
  title?: string;
  entityType: 'assetId' | 'supportTicketId' | 'maintenanceId';
  entityId: string;
  fileType: string;
  userPlan: Plan;
  canManage: boolean;
}

export default function FileAttachmentSection({
  title = 'Attachments',
  entityType,
  entityId,
  fileType,
  userPlan,
  canManage,
}: FileAttachmentSectionProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStorage, setTotalStorage] = useState(0);
  const storageLimit = getStorageLimit(userPlan);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ [entityType]: entityId, limit: '50' });
      const res = await fetch(`/api/files?${params}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        const total = (data.files || []).reduce((sum: number, f: FileItem) => sum + f.size, 0);
        setTotalStorage(total);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
        const removed = files.find((f) => f.id === id);
        if (removed) setTotalStorage((prev) => Math.max(0, prev - removed.size));
      }
    } catch { /* ignore */ }
  };

  const handleUploadComplete = (uploaded: UploadedFile[]) => {
    setFiles((prev) => [...uploaded, ...prev]);
    const added = uploaded.reduce((sum, f) => sum + f.size, 0);
    setTotalStorage((prev) => prev + added);
  };

  const usedMB = Math.round(totalStorage / (1024 * 1024) * 10) / 10;
  const limitLabel = storageLimit === -1 ? 'Unlimited' : `${storageLimit} MB`;
  const nearLimit = storageLimit !== -1 && usedMB >= storageLimit * 0.9;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cloud className="h-4 w-4" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HardDrive className="h-3.5 w-3.5" />
            <span className={nearLimit ? 'text-amber-600 font-medium' : ''}>
              {usedMB} MB / {limitLabel}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <FileGallery
              files={files}
              onDelete={canManage ? handleDelete : undefined}
              readonly={!canManage}
            />
            {canManage && (
              <UploadDropzone
                onUploadComplete={handleUploadComplete}
                fileType={fileType}
                {...{ [entityType]: entityId }}
                maxSizeMB={10}
                maxFiles={10}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
