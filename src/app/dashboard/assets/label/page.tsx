'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FeatureLock } from '@/components/ui/feature-lock';
import { Loader2, Printer, Download, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

interface LabelData {
  asset: { id: string; assetTag: string; name: string; serialNumber: string | null; model: string | null; department: string | null; location: string | null };
  branding: { logo: string | null; brandName: string | null; primaryColor: string; secondaryColor: string; isEnterprise: boolean };
  qrCode: string;
}

type TplSize = 'compact' | 'standard' | 'large';
const QR_PX: Record<TplSize, number> = { compact: 60, standard: 80, large: 100 };

export default function AssetLabelPage() {
  const searchParams = useSearchParams();
  const assetIds = searchParams.get('ids')?.split(',') || [];
  const [labels, setLabels] = useState<LabelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [perPage, setPerPage] = useState('4');
  const [template, setTemplate] = useState<TplSize>('standard');
  const [barcodes, setBarcodes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (assetIds.length === 0) { setLoading(false); return; }
    Promise.all(assetIds.map(id => fetch(`/api/assets/${id}/label`).then(r => r.json())))
      .then(results => { const valid = results.filter(r => r.qrCode && !r.error); setLabels(valid); if (valid.length > 0) setIsPro(true); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [searchParams]);

  useEffect(() => {
    if (labels.length === 0) return;
    (async () => {
      try {
        const bwipjs = (await import('bwip-js')).default || (await import('bwip-js'));
        const newBarcodes: Record<string, string> = {};
        labels.forEach(l => {
          try {
            const c = document.createElement('canvas');
            (bwipjs as any).toCanvas(c, { bcid: 'code128', text: l.asset.assetTag, scale: 3, height: 10, includetext: true, textxalign: 'center' });
            newBarcodes[l.asset.id] = c.toDataURL('image/png');
          } catch {}
        });
        setBarcodes(newBarcodes);
      } catch {}
    })();
  }, [labels]);

  const qrSize = QR_PX[template];

  const handlePrint = () => window.print();
  const handlePdf = async () => {
    try {
      const { default: JsPDF } = await import('jspdf');
      const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pp = parseInt(perPage); const cols = pp <= 2 ? 1 : 2; const rows = Math.ceil(pp / cols);
      const cw = 190 / cols; const ch = 277 / rows; const m = 2;
      for (let i = 0; i < labels.length; i++) {
        if (i > 0 && i % pp === 0) pdf.addPage();
        const idx = i % pp; const col = idx % cols; const row = Math.floor(idx / cols);
        const x = 10 + col * cw + m; const y = 10 + row * ch + m;
        const lw = cw - m * 2; const lh = ch - m * 2; const lab = labels[i];
        pdf.setDrawColor(180, 180, 180); pdf.rect(x, y, lw, lh);
        pdf.setFillColor(lab.branding.primaryColor); pdf.rect(x, y, lw, 2, 'F');
        pdf.setFontSize(8); pdf.setTextColor(0, 0, 0);
        pdf.text(lab.asset.name.substring(0, 30), x + 2, y + 7);
        pdf.setFontSize(10); pdf.text(lab.asset.assetTag, x + 2, y + 13);
        pdf.setFontSize(6); pdf.setTextColor(80, 80, 80);
        let ty = y + 18;
        if (lab.asset.serialNumber) { pdf.text(`SN: ${lab.asset.serialNumber}`, x + 2, ty); ty += 3; }
        if (lab.asset.department) { pdf.text(lab.asset.department || '', x + 2, ty); ty += 3; }
        if (lab.asset.location) { pdf.text(lab.asset.location || '', x + 2, ty); ty += 3; }
        const qrMm = template === 'compact' ? 12 : template === 'large' ? 20 : 16;
        if (barcodes[lab.asset.id]) pdf.addImage(barcodes[lab.asset.id], 'PNG', x + 2, y + lh - 10, lw - qrMm - 8, 8);
        if (lab.qrCode) {
          try { const qi = new Image(); qi.src = lab.qrCode; await new Promise<void>(r => { qi.onload = () => r(); setTimeout(r, 600); }); pdf.addImage(qi, 'PNG', x + lw - qrMm - 2, y + lh - qrMm - 2, qrMm, qrMm); } catch {}
        }
      }
      pdf.save(`asset-labels-${Date.now()}.pdf`); toast({ title: 'Downloaded' });
    } catch { toast({ title: 'Failed', variant: 'destructive' }); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!isPro && !loading) return <FeatureLock featureName="Asset Labels" featureDescription="Generate QR codes, barcodes, and printable labels." requiredPlan="PRO" currentPlan="FREE" />;

  const cols = perPage === '1' ? 1 : 2;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 no-print flex-wrap">
        <Link href="/dashboard/assets"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1"><h1 className="text-2xl font-bold">Asset Labels</h1><p className="text-sm text-muted-foreground">{labels.length} asset{labels.length !== 1 ? 's' : ''}</p></div>
        {labels.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={template} onValueChange={(v) => setTemplate(v as TplSize)}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compact">Compact</SelectItem><SelectItem value="standard">Standard</SelectItem><SelectItem value="large">Large</SelectItem></SelectContent></Select>
            <Select value={perPage} onValueChange={setPerPage}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1/page</SelectItem><SelectItem value="2">2/page</SelectItem><SelectItem value="4">4/page</SelectItem><SelectItem value="10">10/page</SelectItem></SelectContent></Select>
            <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" />Print</Button>
            <Button size="sm" onClick={handlePdf}><Download className="h-4 w-4 mr-1" />PDF</Button>
          </div>
        )}
      </div>

      {labels.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No assets selected.</CardContent></Card>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {labels.map(label => (
            <div key={label.asset.id} className="border border-slate-300 rounded bg-white overflow-hidden print:border-black print:shadow-none">
              <div className="h-1" style={{ backgroundColor: label.branding.primaryColor }} />
              <div className="p-2">
                <div className="flex items-center gap-1 mb-1">
                  {label.branding.isEnterprise && label.branding.logo ? (
                    <img src={label.branding.logo} alt="" className="h-3 w-auto" />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-600">MOZASSETS</span>
                  )}
                  <span className="text-[8px] text-slate-400 uppercase">Label</span>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-slate-800 leading-tight truncate">{label.asset.name}</p>
                    <p className="text-sm font-bold text-slate-900 tracking-wide">{label.asset.assetTag}</p>
                    <div className="text-[9px] text-slate-500 leading-relaxed">
                      {label.asset.serialNumber && <p>SN: {label.asset.serialNumber}</p>}
                      {label.asset.department && <p>{label.asset.department}</p>}
                      {label.asset.location && <p>{label.asset.location}</p>}
                    </div>
                  </div>
                  <div className="shrink-0 self-center">
                    <img src={label.qrCode} alt="QR" style={{ width: qrSize, height: qrSize, display: 'block' }} />
                  </div>
                </div>

                {barcodes[label.asset.id] && (
                  <div className="mt-1 pt-1 border-t border-slate-200">
                    <img src={barcodes[label.asset.id]} alt="Barcode" className="w-full" style={{ height: template === 'compact' ? 32 : 36, objectFit: 'contain' }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media print { .no-print { display: none !important; } body { margin: 0; padding: 4mm; } @page { margin: 4mm; size: A4; } }
      `}</style>
    </div>
  );
}
