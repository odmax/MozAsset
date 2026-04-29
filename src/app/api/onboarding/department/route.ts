import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/user-context';

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext();
    if (!context?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, code, description } = await request.json();

    const department = await prisma.department.create({
      data: {
        name,
        code: code || name.substring(0, 3).toUpperCase(),
        description,
        organizationId: context.organizationId,
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error('Onboarding department error:', error);
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
  }
}