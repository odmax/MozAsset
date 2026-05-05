import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// This route is for emergency repair only - should be disabled in production
const ALLOWED_EMAIL = 'Ademoyemo@gmail.com';
const DEFAULT_PASSWORD = 'password123';

export async function POST(request: Request) {
  try {
    // Basic protection - check for secret header (optional)
    const secret = request.headers.get('x-repair-secret');
    const isDev = process.env.NODE_ENV === 'development';
    
    if (!isDev && secret !== process.env.REPAIR_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email = ALLOWED_EMAIL, password = DEFAULT_PASSWORD } = await request.json().catch(() => ({}));

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if admin already exists
    const existing = await prisma.internalAdmin.findFirst({
      where: { 
        email: { equals: normalizedEmail, mode: 'insensitive' }
      }
    });

    if (existing) {
      // Update existing admin
      const hashedPassword = await bcrypt.hash(password, 12);
      const updated = await prisma.internalAdmin.update({
        where: { id: existing.id },
        data: {
          password: hashedPassword,
          isActive: true,
          role: 'OWNER',
          name: existing.name || 'Ademoyemo',
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Admin user updated',
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
        passwordSet: true,
      });
    }

    // Create new admin
    const hashedPassword = await bcrypt.hash(password, 12);
    const newAdmin = await prisma.internalAdmin.create({
      data: {
        email: normalizedEmail,
        name: 'Ademoyemo',
        password: hashedPassword,
        role: 'OWNER',
        isActive: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Admin user created',
      email: newAdmin.email,
      role: newAdmin.role,
      isActive: newAdmin.isActive,
      passwordSet: true,
      note: `Use password: ${password}`,
    });

  } catch (error) {
    console.error('Seed owner error:', error);
    return NextResponse.json(
      { error: 'Failed to seed owner', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to create/update owner admin',
    defaultEmail: ALLOWED_EMAIL,
    note: 'This is a repair endpoint. Disable in production.',
  });
}
