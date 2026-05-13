'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Crown, CheckCircle, Loader2 } from 'lucide-react';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: 'FREE' | 'PRO' | 'ENTERPRISE';
  billingPeriodEnd: string | null;
}

const feedbackOptions = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'missing_features', label: 'Missing features' },
  { value: 'bugs_issues', label: 'Bugs / Issues' },
  { value: 'switching_platforms', label: 'Switching platforms' },
  { value: 'temporary_use', label: 'Temporary use only' },
  { value: 'other', label: 'Other' },
];

const losses = [
  'CSV / PDF export capabilities',
  'Premium financial and maintenance reports',
  'Advanced analytics and charts',
  'Unlimited assets, departments, and locations',
];

export function CancelSubscriptionModal({
  isOpen,
  onClose,
  currentPlan,
  billingPeriodEnd,
}: CancelSubscriptionModalProps) {
  const [cancelType, setCancelType] = useState<'end_of_period' | 'immediate'>('end_of_period');
  const [feedback, setFeedback] = useState('');
  const [feedbackDetail, setFeedbackDetail] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{
    type: 'end_of_period' | 'immediate';
    endDate: string | null;
  } | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          cancelType,
          feedback: feedback || null,
          feedbackDetail: feedbackDetail || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to cancel subscription');
        setLoading(false);
        return;
      }

      setSuccess({
        type: cancelType,
        endDate: data.endDate || billingPeriodEnd,
      });
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    setSuccess(null);
    setCancelType('end_of_period');
    setFeedback('');
    setFeedbackDetail('');
    setConfirmed(false);
    setError('');
    onClose();
  };

  const planPrice = currentPlan === 'PRO' ? 'R149/month' : 'R599/month';
  const formattedEndDate = billingPeriodEnd
    ? new Date(billingPeriodEnd).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const successEndDate = success?.endDate
    ? new Date(success.endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !loading) handleDone(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {!success ? (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <DialogTitle className="text-xl">We&apos;re sorry to see you go</DialogTitle>
              <DialogDescription>
                Please review what you&apos;ll lose before confirming.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 rounded-lg text-center">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* What you lose */}
              <div>
                <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  You will lose access to:
                </h4>
                <ul className="space-y-1.5">
                  {losses.map((loss) => (
                    <li key={loss} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">&#x2022;</span>
                      {loss}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Current plan summary */}
              <div className="p-4 border rounded-lg bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{currentPlan} Plan</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{planPrice}</span>
                </div>
                {cancelType === 'end_of_period' && formattedEndDate && (
                  <p className="text-xs text-muted-foreground">
                    Your plan renews on {formattedEndDate}
                  </p>
                )}
              </div>

              {/* Cancellation options */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Cancellation option</h4>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="radio"
                      name="cancelType"
                      value="end_of_period"
                      checked={cancelType === 'end_of_period'}
                      onChange={() => setCancelType('end_of_period')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">Cancel at end of billing period</p>
                      <p className="text-xs text-muted-foreground">
                        {formattedEndDate
                          ? `Keep access until ${formattedEndDate}, then downgrade to Free`
                          : 'Keep access until the end of your current billing period'
                        }
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="radio"
                      name="cancelType"
                      value="immediate"
                      checked={cancelType === 'immediate'}
                      onChange={() => setCancelType('immediate')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">Immediate downgrade to Free</p>
                      <p className="text-xs text-muted-foreground">
                        Lose access to premium features right away
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Feedback */}
              <div>
                <h4 className="text-sm font-semibold mb-2">
                  What&apos;s the main reason? <span className="text-muted-foreground font-normal">(optional)</span>
                </h4>
                <select
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="">Select a reason...</option>
                  {feedbackOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {feedback === 'other' && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Tell us more</h4>
                  <textarea
                    value={feedbackDetail}
                    onChange={(e) => setFeedbackDetail(e.target.value)}
                    placeholder="Please share any additional feedback..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md text-sm bg-background resize-none"
                  />
                </div>
              )}

              {/* Confirmation */}
              <label className="flex items-start gap-3 p-3 border rounded-lg bg-amber-50/50">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                <p className="text-sm text-amber-800">
                  I understand that I will lose access to premium features and my data limits will be reduced.
                </p>
              </label>
            </div>

            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={handleDone} className="flex-1" disabled={loading}>
                Keep my plan
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={!confirmed || loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : cancelType === 'immediate' ? (
                  'Downgrade to Free'
                ) : (
                  'Cancel Subscription'
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <DialogTitle className="text-xl">
                {success.type === 'immediate' ? 'Downgraded to Free' : 'Subscription Canceled'}
              </DialogTitle>
              <DialogDescription>
                {success.type === 'immediate'
                  ? 'Your plan has been changed to Free.'
                  : 'Your subscription has been canceled.'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 border rounded-lg bg-slate-50/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">
                  {success.type === 'immediate' ? 'Free' : `${currentPlan} (until ${successEndDate})`}
                </span>
              </div>
              {success.type === 'end_of_period' && successEndDate && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Access ends</span>
                    <span className="font-medium">{successEndDate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Downgrade to Free</span>
                    <span className="font-medium">{successEndDate}</span>
                  </div>
                </>
              )}
              {success.type === 'immediate' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-amber-600">Downgraded to Free</span>
                </div>
              )}
            </div>

            {success.type === 'end_of_period' && (
              <p className="text-sm text-muted-foreground text-center">
                You will retain access to all {currentPlan} features until {successEndDate}.
                After that, your account will be downgraded to Free.
              </p>
            )}

            <Button onClick={handleDone} className="w-full mt-2">
              Done
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
