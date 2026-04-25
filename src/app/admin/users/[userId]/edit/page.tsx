'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  ArrowLeft,
  Save,
  AlertCircle,
  User,
  Mail,
  Building2,
  Shield,
  CreditCard,
  ToggleLeft,
  CheckCircle,
  Calendar
} from 'lucide-react';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  plan: string;
  isActive: boolean;
  emailVerified: Date | null;
  createdAt: Date;
  department: { id: string; name: string } | null;
  departmentId: string | null;
  subscriptionStatus: string;
  assetLimit: number;
  departmentLimit: number;
  locationLimit: number;
  userLimit: number;
  onBoardingComplete: boolean;
  billingProvider: string;
  billingPeriodStart: Date | null;
  billingPeriodEnd: Date | null;
  canceledAt: Date | null;
  isPlatformAdmin: boolean;
  createdAt: string;
}

export default function AdminUserEditPage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    role: 'EMPLOYEE',
    plan: 'FREE',
    isActive: true,
    isEmailVerified: false,
    departmentId: '',
    subscriptionStatus: 'ACTIVE',
    assetLimit: 50,
    departmentLimit: 1,
    locationLimit: 1,
    userLimit: 3,
    onBoardingComplete: false,
  });

  useEffect(() => {
    fetch(`/api/admin/users/${params.userId}`)
      .then(res => res.json())
      .then(data => {
        if (data?.error) {
          setError(data.error);
        } else {
          setFormData({
            name: data.name || '',
            role: data.role || 'EMPLOYEE',
            plan: data.plan || 'FREE',
            isActive: data.isActive ?? true,
            isEmailVerified: !!data.emailVerified,
            departmentId: data.departmentId || '',
            subscriptionStatus: data.subscriptionStatus || 'ACTIVE',
            assetLimit: data.assetLimit ?? 50,
            departmentLimit: data.departmentLimit ?? 1,
            locationLimit: data.locationLimit ?? 1,
            userLimit: data.userLimit ?? 3,
            onBoardingComplete: data.onBoardingComplete ?? false,
          });
        }
      })
      .catch(() => setError('Failed to load user'))
      .finally(() => setLoading(false));
  }, [params.userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${params.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          plan: formData.plan,
          isActive: formData.isActive,
          emailVerified: formData.isEmailVerified ? new Date().toISOString() : null,
          departmentId: formData.departmentId || null,
          assetLimit: formData.assetLimit,
          departmentLimit: formData.departmentLimit,
          locationLimit: formData.locationLimit,
          userLimit: formData.userLimit,
          onBoardingComplete: formData.onBoardingComplete,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update user');
      } else {
        setSuccess('User updated successfully');
        setTimeout(() => router.push(`/admin/users/${params.userId}`), 1500);
      }
    } catch (err) {
      setError('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !formData.name) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href={`/admin/users/${params.userId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to User
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                <span>{success}</span>
              </div>
            )}

            {/* Profile Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Organization & Role Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization & Role
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Department</label>
                  <Input
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    placeholder="Department ID (leave empty for no department)"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Onboarding Complete</label>
                  <select
                    value={formData.onBoardingComplete ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, onBoardingComplete: e.target.value === 'true' })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="false">Incomplete</option>
                    <option value="true">Complete</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Plan & Billing Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Plan & Billing
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="FREE">Free (50 assets, 1 dept/loc)</option>
                    <option value="PRO">Pro (1,000 assets, unlimited)</option>
                    <option value="ENTERPRISE">Enterprise (unlimited)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Subscription Status</label>
                  <select
                    value={formData.subscriptionStatus}
                    onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="CANCELED">Canceled</option>
                    <option value="PAST_DUE">Past Due</option>
                    <option value="PAUSED">Paused</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Asset Limit</label>
                  <Input
                    type="number"
                    value={formData.assetLimit}
                    onChange={(e) => setFormData({ ...formData, assetLimit: parseInt(e.target.value) || 50 })}
                    placeholder="50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Department Limit</label>
                  <Input
                    type="number"
                    value={formData.departmentLimit}
                    onChange={(e) => setFormData({ ...formData, departmentLimit: parseInt(e.target.value) || 1 })}
                    placeholder="1"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Location Limit</label>
                  <Input
                    type="number"
                    value={formData.locationLimit}
                    onChange={(e) => setFormData({ ...formData, locationLimit: parseInt(e.target.value) || 1 })}
                    placeholder="1"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">User Limit</label>
                  <Input
                    type="number"
                    value={formData.userLimit}
                    onChange={(e) => setFormData({ ...formData, userLimit: parseInt(e.target.value) || 3 })}
                    placeholder="3"
                  />
                </div>
              </div>
            </div>

            {/* Account Status Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Status
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Account Status</label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Verified</label>
                  <select
                    value={formData.isEmailVerified ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, isEmailVerified: e.target.value === 'true' })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="false">Unverified</option>
                    <option value="true">Verified</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" asChild type="button">
                <Link href={`/admin/users/${params.userId}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}