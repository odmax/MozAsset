import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { generateAssetTag } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, serial, brand } = await request.json();

    const [department, location] = await Promise.all([
      prisma.department.findFirst(),
      prisma.location.findFirst(),
    ]);

    const asset = await prisma.asset.create({
      data: {
        assetTag: generateAssetTag('AST'),
        name,
        serialNumber: serial,
        brand,
        departmentId: department?.id,
        locationId: location?.id,
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