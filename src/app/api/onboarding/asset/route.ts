import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/user-context';
import { generateAssetTag } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext();
    if (!context?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, serial, brand } = await request.json();

    const [department, location] = await Promise.all([
      prisma.department.findFirst({ where: { organizationId: context.organizationId } }),
      prisma.location.findFirst({ where: { organizationId: context.organizationId } }),
    ]);

    const asset = await prisma.asset.create({
      data: {
        assetTag: generateAssetTag('AST'),
        name,
        serialNumber: serial,
        brand,
        departmentId: department?.id,
        locationId: location?.id,
        organizationId: context.organizationId,
        status: 'AVAILABLE',
        condition: 'GOOD',
      },
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Onboarding asset error:', error);
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}