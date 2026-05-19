'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle, AlertTriangle, Upload, Trash2, Building2, Globe } from 'lucide-react';

interface OrgSettings {
  name: string;
  description: string | null;
  industry: string | null;
  companySize: string | null;
  orgEmail: string | null;
  phone: string | null;
  alternatePhone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  logo: string | null;
  favicon: string | null;
  primaryColor: string;
  secondaryColor: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  defaultLanguage: string;
}

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing',
  'Retail', 'Construction', 'Transportation', 'Energy', 'Agriculture',
  'Hospitality', 'Media', 'Real Estate', 'Non-profit', 'Government', 'Other',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

const TIMEZONES = [
  'Africa/Johannesburg', 'Africa/Cairo', 'Africa/Lagos', 'Africa/Nairobi',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Australia/Sydney', 'Pacific/Auckland',
];

const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'];

const CURRENCIES = [
  { value: 'ZAR', label: 'ZAR (R)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'KES', label: 'KES (KSh)' },
  { value: 'NGN', label: 'NGN (₦)' },
  { value: 'EGP', label: 'EGP (E£)' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'af', label: 'Afrikaans' },
  { value: 'zu', label: 'isiZulu' },
  { value: 'xh', label: 'isiXhosa' },
  { value: 'fr', label: 'French' },
  { value: 'pt', label: 'Portuguese' },
];

const PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
  'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape',
];

export default function OrganizationSettings() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/organization/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setSettings(data);
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (field: string, value: any) => {
    if (settings) setSettings({ ...settings, [field]: value });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/organization/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save');
      } else {
        setSettings(data);
        setSuccess('Settings saved successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleBrandUpload = async (file: File, type: 'logo' | 'favicon') => {
    const setLoading = type === 'logo' ? setUploadingLogo : setUploadingFavicon;
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const res = await fetch('/api/organization/branding', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to upload ${type}`);
      } else {
        updateField(type, data.url);
        setSuccess(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      setError(`Failed to upload ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandRemove = async (type: 'logo' | 'favicon') => {
    setError('');
    try {
      const res = await fetch(`/api/organization/branding?type=${type}`, { method: 'DELETE' });
      if (res.ok) {
        updateField(type, null);
      } else {
        const data = await res.json();
        setError(data.error || `Failed to remove ${type}`);
      }
    } catch {
      setError(`Failed to remove ${type}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !settings) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
        <p className="text-muted-foreground">Manage your organization information and preferences</p>
      </div>

      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="contact">Contact Information</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>Basic details about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input id="name" value={settings?.name || ''} onChange={(e) => updateField('name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={settings?.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Brief description of your organization..."
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={settings?.industry || ''} onValueChange={(v) => updateField('industry', v)}>
                    <SelectTrigger id="industry"><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <Select value={settings?.companySize || ''} onValueChange={(v) => updateField('companySize', v)}>
                    <SelectTrigger id="companySize"><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((s) => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact */}
        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>How people can reach your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgEmail">Organization Email</Label>
                  <Input id="orgEmail" type="email" value={settings?.orgEmail || ''} onChange={(e) => updateField('orgEmail', e.target.value)} placeholder="info@company.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" value={settings?.website || ''} onChange={(e) => updateField('website', e.target.value)} placeholder="https://example.com" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={settings?.phone || ''} onChange={(e) => updateField('phone', e.target.value)} placeholder="+27 11 234 5678" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alternatePhone">Alternate Phone</Label>
                  <Input id="alternatePhone" value={settings?.alternatePhone || ''} onChange={(e) => updateField('alternatePhone', e.target.value)} placeholder="+27 82 123 4567" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input id="addressLine1" value={settings?.addressLine1 || ''} onChange={(e) => updateField('addressLine1', e.target.value)} placeholder="123 Main Street" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input id="addressLine2" value={settings?.addressLine2 || ''} onChange={(e) => updateField('addressLine2', e.target.value)} placeholder="Suite 100" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={settings?.city || ''} onChange={(e) => updateField('city', e.target.value)} placeholder="Johannesburg" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Province / State</Label>
                  <Select value={settings?.province || ''} onValueChange={(v) => updateField('province', v)}>
                    <SelectTrigger id="province"><SelectValue placeholder="Select province" /></SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={settings?.country || ''} onChange={(e) => updateField('country', e.target.value)} placeholder="South Africa" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input id="postalCode" value={settings?.postalCode || ''} onChange={(e) => updateField('postalCode', e.target.value)} placeholder="2001" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Customize your organization's visual identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div className="space-y-3">
                <Label>Organization Logo</Label>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted/30">
                    {settings?.logo ? (
                      <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBrandUpload(f, 'logo'); }} className="hidden" />
                    <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                      {uploadingLogo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      {settings?.logo ? 'Replace Logo' : 'Upload Logo'}
                    </Button>
                    {settings?.logo && (
                      <Button variant="ghost" size="sm" onClick={() => handleBrandRemove('logo')} className="text-red-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" /> Remove
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, SVG. Max 5MB.</p>
                  </div>
                </div>
              </div>

              {/* Favicon */}
              <div className="space-y-3 pt-4 border-t">
                <Label>Favicon</Label>
                <div className="flex items-center gap-6">
                  <div className="w-10 h-10 border-2 border-dashed rounded flex items-center justify-center overflow-hidden bg-muted/30">
                    {settings?.favicon ? (
                      <img src={settings.favicon} alt="Favicon" className="w-full h-full object-contain" />
                    ) : (
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input ref={faviconInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBrandUpload(f, 'favicon'); }} className="hidden" />
                    <Button variant="outline" size="sm" onClick={() => faviconInputRef.current?.click()} disabled={uploadingFavicon}>
                      {uploadingFavicon ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      {settings?.favicon ? 'Replace Favicon' : 'Upload Favicon'}
                    </Button>
                    {settings?.favicon && (
                      <Button variant="ghost" size="sm" onClick={() => handleBrandRemove('favicon')} className="text-red-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" /> Remove
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, SVG. Max 1MB.</p>
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input id="primaryColor" value={settings?.primaryColor || '#3b82f6'} onChange={(e) => updateField('primaryColor', e.target.value)} placeholder="#3b82f6" />
                    <div className="w-10 h-10 rounded border shrink-0" style={{ backgroundColor: settings?.primaryColor || '#3b82f6' }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input id="secondaryColor" value={settings?.secondaryColor || '#6366f1'} onChange={(e) => updateField('secondaryColor', e.target.value)} placeholder="#6366f1" />
                    <div className="w-10 h-10 rounded border shrink-0" style={{ backgroundColor: settings?.secondaryColor || '#6366f1' }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Regional and display preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={settings?.timezone || 'Africa/Johannesburg'} onValueChange={(v) => updateField('timezone', v)}>
                    <SelectTrigger id="timezone"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz.replace('_', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select value={settings?.dateFormat || 'DD/MM/YYYY'} onValueChange={(v) => updateField('dateFormat', v)}>
                    <SelectTrigger id="dateFormat"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DATE_FORMATS.map((df) => <SelectItem key={df} value={df}>{df}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={settings?.currency || 'ZAR'} onValueChange={(v) => updateField('currency', v)}>
                    <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultLanguage">Default Language</Label>
                  <Select value={settings?.defaultLanguage || 'en'} onValueChange={(v) => updateField('defaultLanguage', v)}>
                    <SelectTrigger id="defaultLanguage"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  );
}
