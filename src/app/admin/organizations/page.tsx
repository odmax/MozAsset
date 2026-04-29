'use client';

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Loader2,
  Building2,
  Users,
  Package,
  MapPin,
  Calendar
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
  owner: {
    name: string | null;
    email: string;
    plan: string;
  };
  _count: {
    users: number;
    assets: number;
    locations: number;
    departments: number;
  };
}

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);

  useEffect(() => {
    fetch('/api/admin/organizations')
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          redirect('/dashboard');
        }
        return res.json();
      })
      .then(data => {
        setOrganizations(data);
        setFilteredOrgs(data);
      })
      .catch(() => redirect('/dashboard'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (search) {
      const filtered = organizations.filter(org =>
        org.name.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredOrgs(filtered);
    } else {
      setFilteredOrgs(organizations);
    }
  }, [search, organizations]);

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
        <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
        <p className="text-muted-foreground">Manage all organizations on the platform</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Organizations ({filteredOrgs.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
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
                  <th className="text-left p-3 text-sm font-medium">Organization</th>
                  <th className="text-left p-3 text-sm font-medium">Owner</th>
                  <th className="text-left p-3 text-sm font-medium">Plan</th>
                  <th className="text-left p-3 text-sm font-medium">Users</th>
                  <th className="text-left p-3 text-sm font-medium">Assets</th>
                  <th className="text-left p-3 text-sm font-medium">Locations</th>
                  <th className="text-left p-3 text-sm font-medium">Depts</th>
                  <th className="text-left p-3 text-sm font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map((org) => (
                  <tr key={org.id} className="border-t">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{org.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="text-sm">{org.owner.name || org.owner.email}</p>
                        <p className="text-xs text-muted-foreground">{org.owner.email}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={
                        org.owner.plan === 'PRO' ? 'bg-purple-100 text-purple-700' :
                        org.owner.plan === 'ENTERPRISE' ? 'bg-amber-100 text-amber-700' :
                        'bg-muted text-muted-foreground'
                      }>
                        {org.owner.plan}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {org._count.users}
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {org._count.assets}
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {org._count.locations}
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      {org._count.departments}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filteredOrgs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No organizations found
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
