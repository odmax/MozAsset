'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FeatureLock } from '@/components/ui/feature-lock';
import { Loader2, Camera, QrCode, CheckCircle, XCircle, ArrowRight, RefreshCw, Play, StopCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

declare const Html5Qrcode: any;

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [isPro, setIsPro] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/stock-verification')
      .then(r => r.json())
      .then(d => { if (d.sessions) setSessions(d.sessions); })
      .catch(() => {});
  }, []);

  const startScan = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      setScanning(true);
      setResult(null);
      setAsset(null);

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          try {
            const parsed = JSON.parse(decodedText);
            const tag = parsed.tag || decodedText;
            setResult({ raw: decodedText, tag });
            await scanner.stop();
            setScanning(false);
            lookupAsset(tag);
          } catch {
            setResult({ raw: decodedText, tag: decodedText });
            await scanner.stop();
            setScanning(false);
            lookupAsset(decodedText);
          }
        },
        () => {}
      );
    } catch (err: any) {
      toast({ title: 'Camera error', description: err.message || 'Could not access camera', variant: 'destructive' });
      setScanning(false);
    }
  };

  const stopScan = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const lookupAsset = async (tag: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/assets?search=${encodeURIComponent(tag)}`);
      const data = await res.json();
      if (data.assets?.[0]) setAsset(data.assets[0]);
      else {
        const res2 = await fetch(`/api/dashboard/assets?search=${encodeURIComponent(tag)}`);
        const data2 = await res2.json();
        setAsset(data2.assets?.[0] || null);
      }
    } catch {}
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!asset || !selectedSession) return;
    setVerifying(true);
    try {
      const res = await fetch(`/api/dashboard/stock-verification/${selectedSession}`);
      const data = await res.json();
      const items = data.session?.items || [];
      const match = items.find((i: any) => i.assetId === asset.id);
      if (!match) { toast({ title: 'Not in session', description: 'Asset not found in this verification session', variant: 'destructive' }); setVerifying(false); return; }
      await fetch(`/api/dashboard/stock-verification/${selectedSession}/items/${match.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'VERIFIED' }),
      });
      toast({ title: 'Verified', description: `${asset.name} marked as verified` });
    } catch {}
    setVerifying(false);
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">QR Scanner</h1><p className="text-muted-foreground">Scan asset QR labels with your camera</p></div>

      {!isPro ? (
        <FeatureLock featureName="QR Scanning" featureDescription="Use your device camera to scan asset QR codes for quick lookup and stock verification." requiredPlan="PRO" currentPlan="FREE" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" />Scanner</CardTitle><CardDescription>Point camera at an asset QR label</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div id="qr-reader" className="mx-auto" style={{ maxWidth: 350 }} />
              <div className="flex gap-2 justify-center">
                {!scanning ? (
                  <Button onClick={startScan} className="gap-2"><Play className="h-4 w-4" />Start Scanning</Button>
                ) : (
                  <Button variant="outline" onClick={stopScan} className="gap-2"><StopCircle className="h-4 w-4" />Stop</Button>
                )}
              </div>
              {result && <div className="p-3 bg-slate-50 rounded-lg text-sm"><strong>Scanned:</strong> <code>{result.tag}</code></div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" />Asset Details</CardTitle><CardDescription>{asset ? 'Scanned asset information' : 'Scan a label to see details'}</CardDescription></CardHeader>
            <CardContent>
              {loading ? <div className="py-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div> :
               asset ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg flex items-start gap-2"><CheckCircle className="h-5 w-5 text-green-600 mt-0.5" /><div><p className="font-medium text-green-700">Asset Found</p><p className="text-sm text-green-600">{asset.name} — {asset.assetTag}</p></div></div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-slate-50 rounded"><span className="text-muted-foreground">Status</span><p className="font-medium">{asset.status}</p></div>
                    <div className="p-2 bg-slate-50 rounded"><span className="text-muted-foreground">Condition</span><p className="font-medium">{asset.condition}</p></div>
                    {asset.category && <div className="p-2 bg-slate-50 rounded"><span className="text-muted-foreground">Category</span><p className="font-medium">{asset.category.name}</p></div>}
                    {asset.location && <div className="p-2 bg-slate-50 rounded"><span className="text-muted-foreground">Location</span><p className="font-medium">{asset.location.name}</p></div>}
                  </div>

                  {sessions.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-sm font-medium">Verify in Session</p>
                      <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm">
                        <option value="">Select session...</option>
                        {sessions.filter((s: any) => s.status !== 'COMPLETED').map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <Button size="sm" className="w-full gap-1" onClick={handleVerify} disabled={!selectedSession || verifying}>
                        {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}Mark Verified
                      </Button>
                    </div>
                  )}

                  <Link href={`/dashboard/assets/${asset.id}`}><Button variant="outline" className="w-full gap-1"><ArrowRight className="h-4 w-4" />Open Asset</Button></Link>
                </div>
              ) : result ? (
                <div className="p-4 bg-red-50 rounded-lg flex items-start gap-2"><XCircle className="h-5 w-5 text-red-600 mt-0.5" /><div><p className="font-medium text-red-700">Asset Not Found</p><p className="text-sm text-red-600">No asset matches tag <code>{result.tag}</code></p></div></div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <QrCode className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Ready to scan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
