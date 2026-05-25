'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

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
