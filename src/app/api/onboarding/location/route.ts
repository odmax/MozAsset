import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/user-context';

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext();
    if (!context?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, address, building, floor, room } = await request.json();

    const location = await prisma.location.create({
      data: {
        name,
        address,
        building,
        floor,
        room,
        organizationId: context.organizationId,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error('Onboarding location error:', error);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}