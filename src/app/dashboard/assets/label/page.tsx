'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FeatureLock } from '@/components/ui/feature-lock';
import { Loader2, Printer, Download, ArrowLeft, QrCode, Barcode } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

declare const bwipjs: any;
declare const jsPDF: any;

interface LabelData {
  asset: { id: string; assetTag: string; name: string; serialNumber: string | null; model: string | null; department: string | null; location: string | null };
  branding: { logo: string | null; brandName: string | null; primaryColor: string; secondaryColor: string; isEnterprise: boolean };
  qrCode: string;
}

export default function AssetLabelPage() {
  const searchParams = useSearchParams();
  const assetIds = searchParams.get('ids')?.split(',') || [];
  const [labels, setLabels] = useState<LabelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [perPage, setPerPage] = useState('1');
  const [barcodes, setBarcodes] = useState<Record<string, string>>({});
  const barcodeRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  useEffect(() => {
    if (assetIds.length === 0) { setLoading(false); return; }
    Promise.all(assetIds.map(id => fetch(`/api/assets/${id}/label`).then(r => r.json())))
      .then(results => {
        const valid = results.filter(r => r.qrCode && !r.error);
        setLabels(valid);
        if (valid.length > 0) setIsPro(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [searchParams]);

  useEffect(() => {
    if (labels.length === 0) return;
    const loadBwip = async () => {
      try {
        const bwipjs = (await import('bwip-js')).default || (await import('bwip-js'));
        const newBarcodes: Record<string, string> = {};
        labels.forEach(label => {
          try {
            const canvas = document.createElement('canvas');
            (bwipjs as any).toCanvas(canvas, {
              bcid: 'code128',
              text: label.asset.assetTag,
              scale: 3,
              height: 10,
              includetext: true,
              textxalign: 'center',
            });
            newBarcodes[label.asset.id] = canvas.toDataURL('image/png');
          } catch {}
        });
        setBarcodes(newBarcodes);
      } catch {}
    };
    loadBwip();
  }, [labels]);

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    try {
      const { default: JsPDF } = await import('jspdf');
      const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const perPageNum = parseInt(perPage);

      const cols = perPageNum <= 2 ? 1 : 2;
      const rows = Math.ceil(perPageNum / cols);
      const w = 190 / cols;
      const h = 277 / rows;

      for (let i = 0; i < labels.length; i++) {
        if (i > 0 && i % perPageNum === 0) pdf.addPage();
        const idx = i % perPageNum;
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = 10 + col * w;
        const y = 10 + row * h;

        const label = labels[i];
        pdf.setFillColor(label.branding.primaryColor);
        pdf.rect(x, y, w, 6, 'F');
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text(label.asset.name.substring(0, 30), x + 2, y + 12);
        pdf.setFontSize(8);
        pdf.text(`Tag: ${label.asset.assetTag}`, x + 2, y + 18);
        if (label.asset.serialNumber) pdf.text(`SN: ${label.asset.serialNumber}`, x + 2, y + 23);

        if (label.qrCode) {
          const qrImg = new Image();
          qrImg.src = `data:image/svg+xml;base64,${btoa(label.qrCode)}`;
          await new Promise<void>(resolve => { qrImg.onload = () => resolve(); });
          pdf.addImage(qrImg, 'PNG', x + w - 30, y + 8, 22, 22);
        }

        if (barcodes[label.asset.id]) {
          pdf.addImage(barcodes[label.asset.id], 'PNG', x + 2, y + h - 14, w - 4, 10);
        }
      }

      pdf.save(`asset-labels-${Date.now()}.pdf`);
      toast({ title: 'Downloaded', description: 'PDF generated' });
    } catch {
      toast({ title: 'Failed', description: 'Could not generate PDF', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  if (!isPro && !loading) {
    return <FeatureLock featureName="Asset Labels" featureDescription="Generate QR codes, barcodes, and printable labels for your physical assets." requiredPlan="PRO" currentPlan="FREE" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 no-print">
        <Link href="/dashboard/assets"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Asset Labels</h1>
          <p className="text-muted-foreground">{labels.length} asset{labels.length !== 1 ? 's' : ''} selected</p>
        </div>
        {labels.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={perPage} onValueChange={setPerPage}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1/page</SelectItem>
                <SelectItem value="2">2/page</SelectItem>
                <SelectItem value="4">4/page</SelectItem>
                <SelectItem value="10">10/page</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" />Print</Button>
            <Button onClick={handleDownloadPdf}><Download className="h-4 w-4 mr-1" />PDF</Button>
          </div>
        )}
      </div>

      {labels.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No assets selected. Go to the Assets page, select assets, and click "Generate Labels".</CardContent></Card>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${perPage === '1' ? 1 : 2}, 1fr)` }}>
          {labels.map(label => (
            <Card key={label.asset.id} className="print:shadow-none print:border print:border-black">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {label.branding.logo && <img src={label.branding.logo} alt="" className="h-6 w-auto mb-1" />}
                    <p className="font-bold text-sm truncate" style={{ color: label.branding.primaryColor }}>{label.branding.brandName || 'MozAssets'}</p>
                    <p className="font-medium text-sm mt-1">{label.asset.name}</p>
                    <p className="text-xs text-muted-foreground">Tag: {label.asset.assetTag}</p>
                    {label.asset.serialNumber && <p className="text-xs text-muted-foreground">SN: {label.asset.serialNumber}</p>}
                    {label.asset.department && <p className="text-xs text-muted-foreground">Dept: {label.asset.department}</p>}
                    {label.asset.location && <p className="text-xs text-muted-foreground">Loc: {label.asset.location}</p>}
                  </div>
                  <div className="flex flex-col items-center gap-1 ml-3 shrink-0">
                    <div dangerouslySetInnerHTML={{ __html: label.qrCode }} className="w-20 h-20" />
                    {barcodes[label.asset.id] && <img src={barcodes[label.asset.id]} alt={`Barcode ${label.asset.assetTag}`} className="h-8 w-full" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .print\\:shadow-none { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
