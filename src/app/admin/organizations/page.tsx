'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Search, Loader2, Building2, Users, Package, ChevronRight,
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  orgEmail: string | null;
  phone: string | null;
  addressLine1: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  industry: string | null;
  companySize: string | null;
  logo: string | null;
  plan: string;
  createdAt: Date;
  owner: {
    id: string;
    name: string | null;
    email: string;
  };
  _count: {
    users: number;
    assets: number;
    locations: number;
    departments: number;
  };
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate" title={value}>{value}</span>
    </div>
  );
}

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  useEffect(() => {
    fetch('/api/admin/organizations')
      .then(res => res.json())
      .then(data => {
        setOrganizations(data);
        setFilteredOrgs(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (search) {
      const q = search.toLowerCase();
      setFilteredOrgs(organizations.filter(org =>
        org.name.toLowerCase().includes(q) ||
        org.owner.email.toLowerCase().includes(q) ||
        org.orgEmail?.toLowerCase().includes(q)
      ));
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
                placeholder="Search..."
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
                  <th className="text-left p-3 text-sm font-medium">Contact</th>
                  <th className="text-left p-3 text-sm font-medium">Industry</th>
                  <th className="text-left p-3 text-sm font-medium">Plan</th>
                  <th className="text-left p-3 text-sm font-medium">Users</th>
                  <th className="text-left p-3 text-sm font-medium">Assets</th>
                  <th className="text-left p-3 text-sm font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map((org) => (
                  <tr key={org.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                          {org.logo ? (
                            <img src={org.logo} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <Building2 className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{org.name}</p>
                          {org.city && org.country && (
                            <p className="text-xs text-muted-foreground">{org.city}, {org.country}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="text-sm">{org.owner.name || org.owner.email}</p>
                      <p className="text-xs text-muted-foreground">{org.owner.email}</p>
                    </td>
                    <td className="p-3">
                      {org.orgEmail && <p className="text-xs">{org.orgEmail}</p>}
                      {org.phone && <p className="text-xs text-muted-foreground">{org.phone}</p>}
                    </td>
                    <td className="p-3 text-sm">
                      {org.industry || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3">
                      <Badge className={
                        org.plan === 'PRO' ? 'bg-purple-100 text-purple-700' :
                        org.plan === 'ENTERPRISE' ? 'bg-amber-100 text-amber-700' :
                        'bg-muted text-muted-foreground'
                      }>
                        {org.plan}
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
                    <td className="p-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedOrg(org)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
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

      {/* Detail Dialog */}
      <Dialog open={selectedOrg !== null} onOpenChange={(o) => { if (!o) setSelectedOrg(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedOrg?.logo ? (
                <img src={selectedOrg.logo} alt="" className="w-8 h-8 rounded object-contain" />
              ) : (
                <Building2 className="h-6 w-6" />
              )}
              {selectedOrg?.name}
            </DialogTitle>
            <DialogDescription>Organization details and information</DialogDescription>
          </DialogHeader>

          {selectedOrg && (
            <div className="space-y-6">
              {/* General */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">General</h4>
                <div className="bg-muted/30 rounded-lg p-4">
                  <DetailRow label="Organization Name" value={selectedOrg.name} />
                  <DetailRow label="Industry" value={selectedOrg.industry} />
                  <DetailRow label="Company Size" value={selectedOrg.companySize ? `${selectedOrg.companySize} employees` : null} />
                  <DetailRow label="Plan" value={selectedOrg.plan} />
                </div>
              </div>

              {/* Contact */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contact Information</h4>
                <div className="bg-muted/30 rounded-lg p-4">
                  <DetailRow label="Email" value={selectedOrg.orgEmail} />
                  <DetailRow label="Phone" value={selectedOrg.phone} />
                  <DetailRow label="Address" value={selectedOrg.addressLine1} />
                  <DetailRow label="City" value={selectedOrg.city} />
                  <DetailRow label="Province" value={selectedOrg.province} />
                  <DetailRow label="Country" value={selectedOrg.country} />
                </div>
              </div>

              {/* Ownership & Stats */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ownership & Usage</h4>
                <div className="bg-muted/30 rounded-lg p-4">
                  <DetailRow label="Owner" value={selectedOrg.owner.name || selectedOrg.owner.email} />
                  <DetailRow label="Owner Email" value={selectedOrg.owner.email} />
                  <DetailRow label="Users" value={String(selectedOrg._count.users)} />
                  <DetailRow label="Assets" value={String(selectedOrg._count.assets)} />
                  <DetailRow label="Departments" value={String(selectedOrg._count.departments)} />
                  <DetailRow label="Locations" value={String(selectedOrg._count.locations)} />
                  <DetailRow label="Created" value={new Date(selectedOrg.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
