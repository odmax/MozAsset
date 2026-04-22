import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, address, building, floor, room } = await request.json();

    const department = await prisma.department.findFirst();
    
    const location = await prisma.location.create({
      data: {
        name,
        address,
        building,
        floor,
        room,
        departmentId: department?.id,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error('Onboarding location error:', error);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}