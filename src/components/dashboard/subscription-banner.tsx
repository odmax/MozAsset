import { AlertTriangle, Info, XCircle } from 'lucide-react';
import Link from 'next/link';

export function SubscriptionBanner({ status }: { status: string }) {
  const config: Record<string, { icon: any; bg: string; text: string; title: string; cta: string; severity: string }> = {
    GRACE_PERIOD: {
      icon: Info, bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700',
      title: 'Your subscription payment is due', severity: 'text-blue-600',
      cta: 'Your plan is still active. Please complete payment to avoid interruption.',
    },
    PAST_DUE: {
      icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700',
      title: 'Your subscription payment is overdue', severity: 'text-amber-600',
      cta: 'Your plan is at risk of being suspended. Complete payment to continue using Pro/Enterprise features.',
    },
    SUSPENDED: {
      icon: XCircle, bg: 'bg-red-50 border-red-200', text: 'text-red-700',
      title: 'Your subscription has been suspended', severity: 'text-red-600',
      cta: 'Paid features have been disabled. Reactivate your subscription to restore access.',
    },
  };

  const c = config[status];
  if (!c) return null;

  const Icon = c.icon;

  return (
    <div className={`${c.bg} border rounded-lg p-4 flex items-start gap-3`}>
      <Icon className={`h-5 w-5 mt-0.5 ${c.severity}`} />
      <div className="flex-1">
        <p className={`font-medium text-sm ${c.text}`}>{c.title}</p>
        <p className="text-sm text-muted-foreground mt-1">{c.cta}</p>
      </div>
      <Link href="/billing" className={`text-sm font-medium ${c.text} underline whitespace-nowrap`}>Manage Billing</Link>
    </div>
  );
}
