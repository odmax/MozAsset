'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FeatureLock } from '@/components/ui/feature-lock';
import { Loader2, Upload, Trash2, CheckCircle, Palette, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const DEFAULTS = { primaryColor: '#3b82f6', secondaryColor: '#6366f1', brandName: '' };

export default function BrandingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [primary, setPrimary] = useState(DEFAULTS.primaryColor);
  const [secondary, setSecondary] = useState(DEFAULTS.secondaryColor);
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFav, setUploadingFav] = useState(false);

  useEffect(() => { fetchBranding(); }, []);

  const fetchBranding = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/branding');
      const data = await res.json();
      if (data.code === 'UPGRADE_REQUIRED') { setIsEnterprise(false); }
      else if (data.branding) {
        setIsEnterprise(true);
        setPrimary(data.branding.primaryColor || DEFAULTS.primaryColor);
        setSecondary(data.branding.secondaryColor || DEFAULTS.secondaryColor);
        setBrandName(data.branding.brandName || '');
        setLogoUrl(data.branding.logo || null);
        setFaviconUrl(data.branding.favicon || null);
      }
    } catch {}
    setLoading(false);
  };

  const handleUpload = async (file: File, type: 'logo' | 'favicon') => {
    const setter = type === 'logo' ? setUploadingLogo : setUploadingFav;
    setter(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      const res = await fetch('/api/organization/branding', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Upload failed', description: data.error, variant: 'destructive' }); return; }
      if (type === 'logo') setLogoUrl(data.url);
      else setFaviconUrl(data.url);
      toast({ title: 'Uploaded', description: `${type} updated` });
    } catch {}
    setter(false);
  };

  const handleRemove = async (type: 'logo' | 'favicon') => {
    try {
      const res = await fetch(`/api/organization/branding?type=${type}`, { method: 'DELETE' });
      if (!res.ok) { toast({ title: 'Failed', variant: 'destructive' }); return; }
      if (type === 'logo') setLogoUrl(null);
      else setFaviconUrl(null);
      toast({ title: 'Removed', description: `${type} removed` });
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryColor: primary, secondaryColor: secondary, brandName }),
      });
      if (!res.ok) { toast({ title: 'Failed', variant: 'destructive' }); return; }
      toast({ title: 'Saved', description: 'Branding settings updated' });
    } catch {}
    setSaving(false);
  };

  const handleReset = async () => {
    setPrimary(DEFAULTS.primaryColor);
    setSecondary(DEFAULTS.secondaryColor);
    setBrandName(DEFAULTS.brandName);
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryColor: DEFAULTS.primaryColor, secondaryColor: DEFAULTS.secondaryColor, brandName: '' }),
      });
      if (!res.ok) { toast({ title: 'Failed', variant: 'destructive' }); return; }
      toast({ title: 'Reset', description: 'Branding reset to defaults' });
    } catch {}
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Branding</h1>
        <p className="text-muted-foreground">Customize your workspace appearance</p>
      </div>

      {!isEnterprise ? (
        <FeatureLock featureName="Custom Branding" featureDescription="Upload your logo, favicon, and set brand colors for your organization dashboard. Available exclusively on the Enterprise plan." requiredPlan="ENTERPRISE" currentPlan="FREE" />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />Colors &amp; Name</CardTitle>
                  <CardDescription>Set your organization&apos;s brand colors</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Primary color</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={primary} onChange={e => setPrimary(e.target.value)} className="h-10 w-16 rounded border cursor-pointer" />
                        <Input value={primary} onChange={e => setPrimary(e.target.value)} className="font-mono" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary color</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={secondary} onChange={e => setSecondary(e.target.value)} className="h-10 w-16 rounded border cursor-pointer" />
                        <Input value={secondary} onChange={e => setSecondary(e.target.value)} className="font-mono" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Brand name (replaces MozAssets in sidebar)</Label>
                    <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Leave blank for MozAssets" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleSave} disabled={saving}><CheckCircle className="h-4 w-4 mr-1" />Save Colors</Button>
                    <Button variant="outline" onClick={handleReset}><RefreshCw className="h-4 w-4 mr-1" />Reset Defaults</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Logo &amp; Favicon</CardTitle>
                  <CardDescription>Upload your organization logo and favicon (max 2MB images)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-3 p-4 border rounded-lg">
                      <Label>Logo</Label>
                      {logoUrl ? (
                        <div className="space-y-2">
                          <img src={logoUrl} alt="Logo" className="h-10 w-auto rounded" />
                          <Button variant="outline" size="sm" onClick={() => handleRemove('logo')}>
                            <Trash2 className="h-4 w-4 mr-1" />Remove
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
                          {uploadingLogo ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
                          <span className="text-sm text-muted-foreground">Click to upload</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'logo'); }} />
                        </label>
                      )}
                    </div>
                    <div className="space-y-3 p-4 border rounded-lg">
                      <Label>Favicon</Label>
                      {faviconUrl ? (
                        <div className="space-y-2">
                          <img src={faviconUrl} alt="Favicon" className="h-10 w-10 rounded" />
                          <Button variant="outline" size="sm" onClick={() => handleRemove('favicon')}>
                            <Trash2 className="h-4 w-4 mr-1" />Remove
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
                          {uploadingFav ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
                          <span className="text-sm text-muted-foreground">Click to upload</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'favicon'); }} />
                        </label>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>How it will look in your dashboard</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border rounded-lg p-4" style={{ borderColor: secondary + '40' }}>
                    <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: secondary + '30' }}>
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-6 w-auto" />
                      ) : (
                        <div className="h-6 w-24 rounded" style={{ backgroundColor: primary + '20' }} />
                      )}
                      <span className="font-semibold text-sm">{brandName || 'MozAssets'}</span>
                    </div>
                    <div className="space-y-2 pt-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded" style={{ backgroundColor: primary }} />
                        <span className="text-xs">Navigation item</span>
                      </div>
                      <div className="h-2 w-3/4 rounded" style={{ backgroundColor: secondary + '30' }} />
                      <div className="h-2 w-1/2 rounded" style={{ backgroundColor: secondary + '30' }} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <div className="h-8 w-20 rounded text-xs flex items-center justify-center text-white" style={{ backgroundColor: primary }}>Primary</div>
                      <div className="h-8 w-20 rounded text-xs flex items-center justify-center text-white" style={{ backgroundColor: secondary }}>Secondary</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
