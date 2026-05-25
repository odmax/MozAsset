'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCheck,
  Trash2,
  Package,
  ArrowRightLeft,
  Wrench,
  CheckCircle,
  MessageSquare,
  CreditCard,
  AlertCircle,
  Ban,
  Crown,
  UserPlus,
  Download,
  Building2,
  Bell,
  Clock,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  priority: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

interface Props {
  notification: Notification | null;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const typeIcons: Record<string, typeof Bell> = {
  ASSET_ASSIGNED: Package,
  ASSET_TRANSFERRED: ArrowRightLeft,
  MAINTENANCE_DUE: Wrench,
  MAINTENANCE_COMPLETED: CheckCircle,
  SUPPORT_REPLY: MessageSquare,
  BILLING_SUCCESSFUL: CreditCard,
  BILLING_FAILED: AlertCircle,
  SUBSCRIPTION_CANCELLED: Ban,
  PLAN_UPGRADED: Crown,
  USER_INVITED: UserPlus,
  EXPORT_COMPLETED: Download,
  ORGANIZATION_UPDATE: Building2,
  TICKET_ASSIGNED: MessageSquare,
  TICKET_ESCALATED: AlertCircle,
  SLA_BREACH_WARNING: AlertCircle,
  AGENT_REPLY: MessageSquare,
  ACCOUNT_INACTIVE: Clock,
  ACCOUNT_DEACTIVATED: Ban,
  ACCOUNT_DELETION_WARNING: AlertCircle,
  ACCOUNT_REACTIVATED: CheckCircle,
};

const typeLabels: Record<string, string> = {
  ASSET_ASSIGNED: 'Asset Assigned',
  ASSET_TRANSFERRED: 'Asset Transferred',
  MAINTENANCE_DUE: 'Maintenance Due',
  MAINTENANCE_COMPLETED: 'Maintenance Completed',
  SUPPORT_REPLY: 'Support Reply',
  BILLING_SUCCESSFUL: 'Billing Successful',
  BILLING_FAILED: 'Billing Failed',
  SUBSCRIPTION_CANCELLED: 'Subscription Cancelled',
  PLAN_UPGRADED: 'Plan Upgraded',
  USER_INVITED: 'User Invited',
  EXPORT_COMPLETED: 'Export Completed',
  ORGANIZATION_UPDATE: 'Organization Update',
  TICKET_ASSIGNED: 'Ticket Assigned',
  TICKET_ESCALATED: 'Ticket Escalated',
  SLA_BREACH_WARNING: 'SLA Breach Warning',
  AGENT_REPLY: 'Agent Reply',
  ACCOUNT_INACTIVE: 'Account Inactive',
  ACCOUNT_DEACTIVATED: 'Account Deactivated',
  ACCOUNT_DELETION_WARNING: 'Account Deletion Warning',
  ACCOUNT_REACTIVATED: 'Account Reactivated',
};

const iconColors: Record<string, string> = {
  ASSET_ASSIGNED: 'text-blue-600 bg-blue-100',
  ASSET_TRANSFERRED: 'text-purple-600 bg-purple-100',
  MAINTENANCE_DUE: 'text-amber-600 bg-amber-100',
  MAINTENANCE_COMPLETED: 'text-emerald-600 bg-emerald-100',
  SUPPORT_REPLY: 'text-indigo-600 bg-indigo-100',
  BILLING_SUCCESSFUL: 'text-emerald-600 bg-emerald-100',
  BILLING_FAILED: 'text-red-600 bg-red-100',
  SUBSCRIPTION_CANCELLED: 'text-red-600 bg-red-100',
  PLAN_UPGRADED: 'text-purple-600 bg-purple-100',
  USER_INVITED: 'text-cyan-600 bg-cyan-100',
  EXPORT_COMPLETED: 'text-slate-600 bg-slate-100',
  ORGANIZATION_UPDATE: 'text-orange-600 bg-orange-100',
  TICKET_ASSIGNED: 'text-indigo-600 bg-indigo-100',
  TICKET_ESCALATED: 'text-red-600 bg-red-100',
  SLA_BREACH_WARNING: 'text-red-600 bg-red-100',
  AGENT_REPLY: 'text-indigo-600 bg-indigo-100',
  ACCOUNT_INACTIVE: 'text-amber-600 bg-amber-100',
  ACCOUNT_DEACTIVATED: 'text-red-600 bg-red-100',
  ACCOUNT_DELETION_WARNING: 'text-red-600 bg-red-100',
  ACCOUNT_REACTIVATED: 'text-emerald-600 bg-emerald-100',
};

const priorityColors: Record<string, string> = {
  low: 'bg-blue-50 text-blue-700 border-blue-200',
  normal: 'bg-slate-50 text-slate-700 border-slate-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationDetailModal({ notification, onClose, onMarkRead, onDelete }: Props) {
  if (!notification) return null;

  const Icon = typeIcons[notification.type] || Bell;
  const iconColor = iconColors[notification.type] || 'text-muted-foreground bg-muted';
  const priorityColor = priorityColors[notification.priority] || priorityColors.normal;
  const typeLabel = typeLabels[notification.type] || notification.type;
  const hasMetadata = notification.metadata && Object.keys(notification.metadata).length > 0;

  return (
    <Dialog open={!!notification} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold truncate pr-4">{notification.title}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Message */}
          <div>
            <p className="text-sm text-muted-foreground/80 leading-relaxed whitespace-pre-wrap">{notification.message}</p>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Type</p>
              <p className="text-sm">{typeLabel}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Priority</p>
              <Badge variant="outline" className={`text-xs font-medium ${priorityColor}`}>
                {notification.priority}
              </Badge>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Status</p>
              {notification.isRead ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Read</Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Unread</Badge>
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Created</p>
              <p className="text-sm">{formatDate(notification.createdAt)}</p>
            </div>
          </div>

          {/* Metadata */}
          {hasMetadata && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Details</p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
                {Object.entries(notification.metadata!).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-muted-foreground font-medium capitalize min-w-[80px]">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className="text-foreground">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="border-t px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {!notification.isRead && (
              <Button variant="outline" size="sm" onClick={() => { onMarkRead(notification.id); onClose(); }} className="gap-1.5">
                <CheckCheck className="h-3.5 w-3.5" />
                Mark as read
              </Button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => { onDelete(notification.id); onClose(); }} className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
