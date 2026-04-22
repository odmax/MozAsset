'use client';

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Loader2, 
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface Subscription {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  plan: string;
  billingProvider: string;
  subscriptionStatus: string;
  billingPeriodStart: Date | null;
  billingPeriodEnd: Date | null;
  canceledAt: Date | null;
  lastPaymentAt: Date | null;
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredSubs, setFilteredSubs] = useState<Subscription[]>([]);

  useEffect(() => {
    fetch('/api/admin/subscriptions')
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          redirect('/dashboard');
        }
        return res.json();
      })
      .then(data => {
        if (data.error) {
          console.error('API error:', data.error);
          setSubscriptions([]);
          setFilteredSubs([]);
        } else {
          setSubscriptions(data.subscriptions || []);
          setFilteredSubs(data.subscriptions || []);
        }
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setSubscriptions([]);
        setFilteredSubs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (search) {
      const searchLower = search.toLowerCase();
      const filtered = subscriptions.filter(sub => 
        sub.email.toLowerCase().includes(searchLower) ||
        (sub.name && sub.name.toLowerCase().includes(searchLower))
      );
      setFilteredSubs(filtered);
    } else {
      setFilteredSubs(subscriptions);
    }
  }, [search, subscriptions]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'CANCELED':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Canceled</Badge>;
      case 'PAST_DUE':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Past Due</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground">View and manage all subscriptions on the platform</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Subscriptions ({filteredSubs.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subscriptions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">User</th>
                  <th className="text-left p-3 text-sm font-medium">Plan</th>
                  <th className="text-left p-3 text-sm font-medium">Provider</th>
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                  <th className="text-left p-3 text-sm font-medium">Period Start</th>
                  <th className="text-left p-3 text-sm font-medium">Next Renewal</th>
                  <th className="text-left p-3 text-sm font-medium">Last Payment</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((sub) => (
                  <tr key={sub.id} className="border-t">
                    <td className="p-3">
                      <div>
                        <p className="text-sm font-medium">{sub.name || sub.email}</p>
                        <p className="text-xs text-muted-foreground">{sub.email}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={
                        sub.plan === 'PRO' ? 'bg-purple-100 text-purple-700' :
                        sub.plan === 'ENTERPRISE' ? 'bg-amber-100 text-amber-700' :
                        'bg-muted text-muted-foreground'
                      }>
                        {sub.plan}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">
                      {sub.billingProvider || 'None'}
                    </td>
                    <td className="p-3">
                      {getStatusBadge(sub.subscriptionStatus)}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {sub.billingPeriodStart 
                        ? new Date(sub.billingPeriodStart).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {sub.billingPeriodEnd 
                        ? new Date(sub.billingPeriodEnd).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {sub.lastPaymentAt 
                        ? new Date(sub.lastPaymentAt).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))}
                {filteredSubs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No subscriptions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
