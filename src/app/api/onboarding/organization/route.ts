import { NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/user-context';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext();
    if (!context?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Organization name required' }, { status: 400 });
    }

    // Check if user already has an organization
    if (context.organizationId) {
      // Update existing organization
      const org = await prisma.organization.update({
        where: { id: context.organizationId },
        data: { name: name.trim() },
      });
      return NextResponse.json(org);
    }

    // Create new organization with user as owner
    const org = await prisma.organization.create({
      data: {
        name: name.trim(),
        ownerId: context.userId,
      },
    });

    // Link user to organization
    await prisma.user.update({
      where: { id: context.userId },
      data: { organizationId: org.id },
    });

    return NextResponse.json(org);
  } catch (error) {
    console.error('Onboarding organization error:', error);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}
