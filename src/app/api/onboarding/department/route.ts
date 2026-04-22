import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, code, description } = await request.json();

    const department = await prisma.department.create({
      data: {
        name,
        code: code || name.substring(0, 3).toUpperCase(),
        description,
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error('Onboarding department error:', error);
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
  }
}