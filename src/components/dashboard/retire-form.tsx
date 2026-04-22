'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import { retireAsset, disposeAsset } from '@/app/dashboard/assets/actions';

interface RetireFormProps {
  assetId: string;
  assetTag: string;
  assetName: string;
}

export function RetireForm({ assetId, assetTag, assetName }: RetireFormProps) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleRetire = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await retireAsset(assetId, notes);
      router.push(`/dashboard/assets/${assetId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to retire asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispose = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await disposeAsset(assetId, notes);
      router.push(`/dashboard/assets/${assetId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to dispose asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          Retire or Dispose Asset
        </CardTitle>
        <CardDescription>
          {assetTag} - {assetName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <Label>Notes (Required)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for retirement/disposal..."
            required
          />
        </div>
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handleRetire}
            disabled={isSubmitting || !notes}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Retire Asset
          </Button>
          <Button
            variant="destructive"
            onClick={handleDispose}
            disabled={isSubmitting || !notes}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Dispose Asset
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
