'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Clock, CheckCircle, AlertTriangle, UserCheck, Mail, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';

export function EnterpriseSlaCard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/branding')
      .then(r => r.json())
      .then(brandingData => {
        if (brandingData.code !== 'UPGRADE_REQUIRED') {
          return fetch('/api/organization/settings').then(r => r.json());
        }
        return null;
      })
      .then(orgData => {
        if (orgData) {
          return fetch('/api/dashboard/sla-status').then(r => r.json()).then(sla => ({ ...orgData, sla }));
        }
        return null;
      })
      .then(d => { setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!data || !data.slaEnabled) return null;

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-600" />
          Enterprise Support
        </CardTitle>
        <CardDescription>Premium support with SLA guarantee</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.accountManager && (
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border">
            <UserCheck className="h-4 w-4 text-purple-600" />
            <div>
              <p className="text-sm font-medium">{data.accountManager.name || data.accountManager.email}</p>
              <p className="text-xs text-muted-foreground">Dedicated Account Manager</p>
            </div>
            {data.accountManager.email && (
              <Button variant="ghost" size="icon" className="ml-auto" asChild>
                <a href={`mailto:${data.accountManager.email}`}><Mail className="h-4 w-4" /></a>
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 bg-white rounded border">
            <Clock className="h-4 w-4 text-blue-600 mb-1" />
            <p className="text-xs text-muted-foreground">First Response</p>
            <p className="font-medium">{data.slaFirstResponseMin || 60} min</p>
          </div>
          <div className="p-2 bg-white rounded border">
            <CheckCircle className="h-4 w-4 text-green-600 mb-1" />
            <p className="text-xs text-muted-foreground">Resolution</p>
            <p className="font-medium">{data.slaResolutionHours || 24} hours</p>
          </div>
        </div>

        {data.sla && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">{data.sla.totalTickets || 0} tickets</Badge>
            {data.sla.breached > 0 && <Badge className="bg-red-100 text-red-700 text-xs">{data.sla.breached} breached</Badge>}
            {data.sla.resolvedInSla > 0 && <Badge className="bg-green-100 text-green-700 text-xs">{data.sla.resolvedInSla} resolved on time</Badge>}
          </div>
        )}

        <Button variant="outline" size="sm" className="w-full gap-1" asChild>
          <Link href="/dashboard/support"><MessageSquare className="h-4 w-4" />Open Support Ticket</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
