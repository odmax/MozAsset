'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UpgradePlanModal } from '@/components/plan/UpgradePlanModal';
import { 
  User, 
  Mail, 
  Lock, 
  Shield, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  EyeOff,
  Crown,
  Package,
  Check,
  X,
  Building2,
  Palette,
  Upload,
  Trash2,
  CreditCard,
  Bell
} from 'lucide-react';
import { getPlanDetails } from '@/lib/billing';
import Link from 'next/link';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  role: string;
  plan: string;
  emailVerified: string | null;
  appearanceMode: string;
  themeColor: string;
  companyLogoUrl: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [appearanceMode, setAppearanceMode] = useState<'LIGHT' | 'DARK' | 'SYSTEM'>('SYSTEM');
  const [themeColor, setThemeColor] = useState('#222222');
  const [savingAppearance, setSavingAppearance] = useState(false);

  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    fetch('/api/user/profile')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setUser(data);
          setName(data.name || '');
          setAppearanceMode(data.appearanceMode || 'SYSTEM');
          setThemeColor(data.themeColor || '#222222');
          setCompanyLogoUrl(data.companyLogoUrl);
          if (data.appearanceMode) {
            setTheme(data.appearanceMode.toLowerCase());
          }
          if (data.themeColor) {
            document.documentElement.style.setProperty('--theme-color', data.themeColor);
          }
        }
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update profile');
      } else {
        setSaveSuccess(true);
        setUser(data);
      }
    } catch {
      setError('Failed to update profile');
    }

    setSaving(false);
  };

  const handleUpdateAppearance = async () => {
    setSavingAppearance(true);
    setError('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appearanceMode, themeColor }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update appearance');
      } else {
        setTheme(appearanceMode.toLowerCase());
        document.documentElement.style.setProperty('--theme-color', themeColor);
      }
    } catch {
      setError('Failed to update appearance');
    }

    setSavingAppearance(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const res = await fetch('/api/user/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to upload logo');
      } else {
        setCompanyLogoUrl(data.logoUrl);
      }
    } catch {
      setError('Failed to upload logo');
    }

    setUploadingLogo(false);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleLogoDelete = async () => {
    setError('');

    try {
      const res = await fetch('/api/user/logo', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete logo');
      } else {
        setCompanyLogoUrl(null);
      }
    } catch {
      setError('Failed to delete logo');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      setPasswordLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || 'Failed to change password');
      } else {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPasswordError('Failed to change password');
    }

    setPasswordLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const planDetails = user ? getPlanDetails(user.plan as any) : null;
  const canUseThemeColor = user?.plan === 'PRO' || user?.plan === 'ENTERPRISE';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {saveSuccess && (
                  <div className="p-3 text-sm text-green-600 bg-green-50 rounded-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Profile updated successfully
                  </div>
                )}
                {error && (
                  <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {user?.emailVerified ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">Email verified</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-yellow-600">Email not verified</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input value={user?.role || ''} disabled className="bg-muted" />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Logo</CardTitle>
              <CardDescription>Upload your company logo to display in the sidebar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted/30">
                  {companyLogoUrl ? (
                    <img 
                      src={companyLogoUrl} 
                      alt="Company Logo" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {companyLogoUrl ? 'Replace Logo' : 'Upload Logo'}
                  </Button>
                  {companyLogoUrl && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleLogoDelete}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, SVG. Max 2MB.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how the application looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode Toggle */}
              <div className="space-y-3">
                <Label>Theme Mode</Label>
                <div className="flex gap-2">
                  {(['LIGHT', 'DARK', 'SYSTEM'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={appearanceMode === mode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setAppearanceMode(mode);
                        setTheme(mode.toLowerCase());
                      }}
                    >
                      {mode.charAt(0) + mode.slice(1).toLowerCase()}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Theme Color - Gated */}
              <div className="space-y-3">
                <Label>Theme Color</Label>
                {canUseThemeColor ? (
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-12 h-12 rounded border cursor-pointer"
                    />
                    <Input
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-32 font-mono"
                      placeholder="#222222"
                    />
                    <Button 
                      onClick={handleUpdateAppearance}
                      disabled={savingAppearance}
                    >
                      {savingAppearance ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Custom theme colors</p>
                        <p className="text-sm text-muted-foreground">
                          Available on Pro and Enterprise plans
                        </p>
                      </div>
                      <Link href="/upgrade">
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                          Upgrade
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordSuccess && (
                  <div className="p-3 text-sm text-green-600 bg-green-50 rounded-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Password changed successfully
                  </div>
                )}
                {passwordError && (
                  <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {passwordError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    'Change password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your subscription and usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {user?.plan === 'PRO' || user?.plan === 'ENTERPRISE' ? (
                  <Crown className="h-10 w-10 text-purple-500" />
                ) : (
                  <Package className="h-10 w-10 text-muted-foreground" />
                )}
                <div>
                  <p className="text-xl font-semibold">{planDetails?.name} Plan</p>
                  <p className="text-muted-foreground">
                    {user?.plan === 'FREE' ? 'Free forever' : `R149/month`}
                  </p>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Asset Limit</span>
                    <span className="font-medium">{planDetails?.assets === -1 ? 'Unlimited' : planDetails?.assets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department Limit</span>
                    <span className="font-medium">{planDetails?.departments === -1 ? 'Unlimited' : planDetails?.departments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location Limit</span>
                    <span className="font-medium">{planDetails?.locations === -1 ? 'Unlimited' : planDetails?.locations}</span>
                  </div>
                </div>
              </div>
              {user?.plan === 'FREE' && (
                <Button onClick={() => setShowUpgradeModal(true)} className="w-full bg-purple-600 hover:bg-purple-700">
                  Upgrade to Pro
                </Button>
              )}
              {user?.plan === 'PRO' && (
                <Button asChild variant="outline" className="w-full">
                  <a href="/billing">Manage Subscription</a>
                </Button>
              )}
              {user?.plan === 'ENTERPRISE' && (
                <Link href="/contact">
                  <Button variant="outline" className="w-full">Contact Support</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <UpgradePlanModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} currentPlan={(user?.plan as 'FREE' | 'PRO' | 'ENTERPRISE') || 'FREE'} />
    </div>
  );
}