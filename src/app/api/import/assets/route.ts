import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAddAssets } from '@/lib/billing';
import { generateAssetTag } from '@/lib/utils';
import Papa from 'papaparse';

export const dynamic = 'force-dynamic';

const KNOWN_COLUMNS = [
  'name', 'description', 'assetTag', 'serialNumber', 'model', 'brand',
  'category', 'department', 'location', 'vendor', 'purchaseCost',
  'purchaseDate', 'condition', 'status', 'warrantyExpiry', 'notes',
];

interface CsvRow { [key: string]: string | undefined }

async function resolveFks(orgId: string, rows: CsvRow[]) {
  const catNames = Array.from(new Set(rows.map(r => r.category?.trim()).filter((v): v is string => !!v)));
  const deptNames = Array.from(new Set(rows.map(r => r.department?.trim()).filter((v): v is string => !!v)));
  const locNames = Array.from(new Set(rows.map(r => r.location?.trim()).filter((v): v is string => !!v)));
  const vendorNames = Array.from(new Set(rows.map(r => r.vendor?.trim()).filter((v): v is string => !!v)));

  const [cats, depts, locs, vendors] = await Promise.all([
    catNames.length > 0 ? prisma.category.findMany({ where: { organizationId: orgId, name: { in: catNames } } }) : [],
    deptNames.length > 0 ? prisma.department.findMany({ where: { organizationId: orgId, name: { in: deptNames } } }) : [],
    locNames.length > 0 ? prisma.location.findMany({ where: { organizationId: orgId, name: { in: locNames } } }) : [],
    vendorNames.length > 0 ? prisma.vendor.findMany({ where: { organizationId: orgId, name: { in: vendorNames } } }) : [],
  ]);

  const catMap = new Map(cats.map(c => [c.name.toLowerCase(), c.id]));
  const deptMap = new Map(depts.map(d => [d.name.toLowerCase(), d.id]));
  const locMap = new Map(locs.map(l => [l.name.toLowerCase(), l.id]));
  const vendorMap = new Map(vendors.map(v => [v.name.toLowerCase(), v.id]));

  return { catMap, deptMap, locMap, vendorMap };
}

export async function POST(request: Request) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const text = await file.text();

    const parseResult = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().toLowerCase() });
    if (parseResult.errors.length > 0 && !parseResult.data.length) {
      return NextResponse.json({ error: 'Failed to parse CSV', details: parseResult.errors[0].message }, { status: 400 });
    }

    const rows = parseResult.data as CsvRow[];

    const currentCount = await prisma.asset.count({ where: { organizationId: orgId } });
    const limitCheck = canAddAssets(session.plan as any, currentCount);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message || 'Asset limit reached' }, { status: 402 });
    }

    const existingTags = await prisma.asset.findMany({
      where: { organizationId: orgId, assetTag: { in: rows.map(r => r.assettag?.trim()).filter(Boolean) as string[] } },
      select: { assetTag: true },
    });
    const existingTagSet = new Set(existingTags.map(a => a.assetTag.toLowerCase()));

    const { catMap, deptMap, locMap, vendorMap } = await resolveFks(orgId, rows);

    const validAssets: any[] = [];
    const errors: { row: number; message: string }[] = [];
    const validConditions = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];
    const validStatuses = ['AVAILABLE', 'ASSIGNED', 'IN_REPAIR', 'RETIRED', 'DISPOSED', 'LOST'];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      if (!row.name?.trim()) { errors.push({ row: rowNum, message: 'Name is required' }); continue; }

      let assetTag = row.assettag?.trim() || generateAssetTag('AST');
      if (existingTagSet.has(assetTag.toLowerCase())) { errors.push({ row: rowNum, message: `Duplicate asset tag: ${assetTag}` }); continue; }
      existingTagSet.add(assetTag.toLowerCase());

      const categoryId = row.category ? catMap.get(row.category.trim().toLowerCase()) || null : null;
      if (row.category && !categoryId) { errors.push({ row: rowNum, message: `Category "${row.category}" not found` }); continue; }

      const departmentId = row.department ? deptMap.get(row.department.trim().toLowerCase()) || null : null;
      if (row.department && !departmentId) { errors.push({ row: rowNum, message: `Department "${row.department}" not found` }); continue; }

      const locationId = row.location ? locMap.get(row.location.trim().toLowerCase()) || null : null;
      if (row.location && !locationId) { errors.push({ row: rowNum, message: `Location "${row.location}" not found` }); continue; }

      const vendorId = row.vendor ? vendorMap.get(row.vendor.trim().toLowerCase()) || null : null;
      if (row.vendor && !vendorId) { errors.push({ row: rowNum, message: `Vendor "${row.vendor}" not found` }); continue; }

      let purchaseCost: number | undefined;
      if (row.purchasecost) {
        purchaseCost = parseFloat(row.purchasecost.replace(/[^0-9.]/g, ''));
        if (isNaN(purchaseCost)) { errors.push({ row: rowNum, message: `Invalid purchase cost: "${row.purchasecost}"` }); continue; }
      }

      let purchaseDate: Date | undefined;
      if (row.purchasedate) {
        purchaseDate = new Date(row.purchasedate);
        if (isNaN(purchaseDate.getTime())) { errors.push({ row: rowNum, message: `Invalid purchase date: "${row.purchasedate}"` }); continue; }
      }

      let warrantyExpiry: Date | undefined;
      if (row.warrantyexpiry) {
        warrantyExpiry = new Date(row.warrantyexpiry);
        if (isNaN(warrantyExpiry.getTime())) { errors.push({ row: rowNum, message: `Invalid warranty expiry: "${row.warrantyexpiry}"` }); continue; }
      }

      const condition = row.condition?.trim().toUpperCase();
      if (condition && !validConditions.includes(condition)) { errors.push({ row: rowNum, message: `Invalid condition: "${row.condition}". Valid: ${validConditions.join(', ')}` }); continue; }

      const status = row.status?.trim().toUpperCase();
      if (status && !validStatuses.includes(status)) { errors.push({ row: rowNum, message: `Invalid status: "${row.status}". Valid: ${validStatuses.join(', ')}` }); continue; }

      validAssets.push({
        assetTag,
        name: row.name.trim(),
        description: row.description?.trim() || null,
        serialNumber: row.serialnumber?.trim() || null,
        model: row.model?.trim() || null,
        brand: row.brand?.trim() || null,
        status: status || 'AVAILABLE',
        condition: condition || 'GOOD',
        categoryId: categoryId || null,
        locationId: locationId || null,
        departmentId: departmentId || null,
        vendorId: vendorId || null,
        purchaseCost: purchaseCost || null,
        purchaseDate: purchaseDate || null,
        warrantyExpiry: warrantyExpiry || null,
        notes: row.notes?.trim() || null,
        organizationId: orgId,
      });
    }

    if (validAssets.length === 0) {
      return NextResponse.json({ success: false, errors, imported: 0 });
    }

    await prisma.asset.createMany({ data: validAssets });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE' as any,
        entityType: 'Asset',
        entityId: orgId,
        userId: session.userId,
        changes: { action: 'csv_import', count: validAssets.length },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      imported: validAssets.length,
      total: rows.length,
      errors: errors.length > 0 ? errors.slice(0, 20) : [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[import-assets] Error:', message);
    return NextResponse.json({ error: `Import failed: ${message}` }, { status: 500 });
  }
}
