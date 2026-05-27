'use client';

import { useState } from 'react';
import type { Plan } from '@prisma/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Copy, Check, Shield, Zap, ExternalLink, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PLAN_PRICES: Record<string, number> = { PRO: 149, ENTERPRISE: 599 };

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  currentPlan: string;
  targetPlan: string;
  canForceManually: boolean;
  onPlanChanged: () => void;
}

export function PlanUpgradeModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  currentPlan,
  targetPlan,
  canForceManually,
  onPlanChanged,
}: PlanUpgradeModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<'send' | 'force' | null>(null);
  const [sent, setSent] = useState(false);
  const [payLink, setPayLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const amount = PLAN_PRICES[targetPlan] || 0;

  const handleSendLink = async () => {
    setLoading('send');
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/send-upgrade-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPlan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send upgrade link');
        return;
      }
      setSent(true);
      setPayLink(data.upgradeRequest?.payLink || data.upgradeRequest?.checkoutUrl || '');
      toast({ title: 'Payment link sent', description: `Payment link was sent to ${userEmail}` });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleCopyLink = async () => {
    if (!payLink) return;
    try {
      await navigator.clipboard.writeText(payLink);
      setCopied(true);
      toast({ title: 'Copied', description: 'Payment link copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Error', description: 'Failed to copy link', variant: 'destructive' });
    }
  };

  const handleForceApply = async () => {
    setLoading('force');
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/change-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan, forceManually: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to apply plan');
        return;
      }
      toast({ title: 'Plan applied', description: `User upgraded to ${targetPlan}` });
      onPlanChanged();
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Upgrade to {targetPlan}
          </DialogTitle>
          <DialogDescription>
            {currentPlan} → {targetPlan} plan upgrade requires payment of <strong>R{amount}/month</strong>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {sent ? (
          <div className="space-y-8">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-green-700 font-medium">Payment link sent</p>
              <p className="text-sm text-green-600 mt-1">
                An email with the payment link has been sent to <strong>{userEmail}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy payment link'}
              </Button>

              {payLink && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => window.open(payLink, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open payment page
                </Button>
              )}
            </div>

            <Button variant="ghost" className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current plan</span>
                <span className="font-medium">{currentPlan}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Target plan</span>
                <span className="font-medium text-amber-600">{targetPlan}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-medium">R{amount}/month</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full gap-2"
                onClick={handleSendLink}
                disabled={!!loading}
              >
                {loading === 'send' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send payment link to customer
              </Button>

              {canForceManually && (
                <Button
                  variant="outline"
                  className="w-full gap-2 border-amber-200 hover:bg-amber-50 text-amber-700"
                  onClick={handleForceApply}
                  disabled={!!loading}
                >
                  {loading === 'force' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  Apply plan without payment (Owner only)
                </Button>
              )}

              <Button variant="ghost" className="w-full" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
