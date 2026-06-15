'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

interface ImportResult { imported: number; total: number; errors: { row: number; message: string }[] }

const SAMPLE_CSV = `name,assetTag,description,serialNumber,category,department,location,purchaseCost,purchaseDate,condition,status
Dell Latitude 5420,,Work laptop,SN123456,Laptops,IT,Main Office,12000,2024-01-15,NEW,ASSIGNED
HP LaserJet Pro,,Office printer,,Printers,Admin,Main Office,8500,2023-06-01,GOOD,AVAILABLE
iPhone 15 Pro,MZB-001,Company phone,IMEI789,Mobile Devices,Sales,Johannesburg,22999,2024-09-01,NEW,ASSIGNED`;

export default function AssetImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError('');
    setResult(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/import/assets', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) { setError(data.error || 'Import failed'); return; }
      setResult(data);
      toast({ title: data.success === false ? 'Import completed with errors' : 'Import successful', description: `${data.imported} of ${data.total} rows imported` });
    } catch { setError('Network error'); }
    setImporting(false);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'asset-import-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/assets"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Assets</h1>
          <p className="text-muted-foreground">Bulk import assets from a CSV file</p>
        </div>
      </div>

      {!result ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Upload CSV</CardTitle>
              <CardDescription>Select a .csv file with your asset data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                {file ? (
                  <>
                    <FileSpreadsheet className="h-10 w-10 text-green-600" />
                    <span className="font-medium text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <span className="font-medium text-sm">Click to select a CSV file</span>
                    <span className="text-xs text-muted-foreground">or drag and drop here</span>
                  </>
                )}
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setError(''); } }} />
              </label>

              {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg flex items-start gap-2"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />{error}</div>}

              <Button className="w-full gap-2" onClick={handleImport} disabled={!file || importing}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? 'Importing...' : 'Import Assets'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" />CSV Template</CardTitle>
              <CardDescription>Download a sample file with the correct columns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Your CSV should include headers matching these columns. Only <strong>name</strong> is required.</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {['name*', 'assetTag', 'description', 'serialNumber', 'model', 'brand', 'category', 'department', 'location', 'vendor', 'purchaseCost', 'purchaseDate', 'condition', 'status', 'warrantyExpiry', 'notes'].map(col => (
                  <div key={col} className="flex items-center gap-1 p-1"><Badge variant="secondary" className="text-xs font-mono">{col}</Badge></div>
                ))}
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={downloadSample}>
                <Download className="h-4 w-4" />
                Download Template
              </Button>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>category</strong>, <strong>department</strong>, <strong>location</strong>, and <strong>vendor</strong> are resolved by name (case-insensitive).</p>
                <p><strong>assetTag</strong> is auto-generated if left blank.</p>
                <p><strong>condition</strong> must be: NEW, GOOD, FAIR, POOR, DAMAGED</p>
                <p><strong>status</strong> must be: AVAILABLE, ASSIGNED, IN_REPAIR, RETIRED, DISPOSED, LOST</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.errors.length === 0 ? <CheckCircle className="h-6 w-6 text-green-600" /> : result.imported > 0 ? <AlertTriangle className="h-6 w-6 text-amber-600" /> : <XCircle className="h-6 w-6 text-red-600" />}
              Import {result.imported > 0 ? 'Complete' : 'Failed'}
            </CardTitle>
            <CardDescription>
              {result.imported} of {result.total} rows imported successfully
              {result.errors.length > 0 && ` — ${result.errors.length} errors found`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.errors.length > 0 && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg max-h-64 overflow-y-auto">
                  <p className="font-medium text-red-700 mb-2">Row Errors</p>
                  <div className="space-y-1">
                    {result.errors.map((e, i) => (
                      <div key={i} className="text-sm text-red-600 flex items-start gap-2">
                        <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span><strong>Row {e.row}:</strong> {e.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {result.errors.length > 20 && <p className="text-xs text-muted-foreground">Showing first 20 of {result.errors.length} errors</p>}
              </div>
            )}

            {result.imported > 0 && (
              <div className="p-4 bg-green-50 rounded-lg flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-700">{result.imported} assets imported successfully</p>
                  <p className="text-sm text-green-600">Audit log created with import record</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => { setResult(null); setFile(null); setError(''); }} variant="outline">
                Import Another File
              </Button>
              <Button onClick={() => router.push('/dashboard/assets')}>
                View Assets
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
