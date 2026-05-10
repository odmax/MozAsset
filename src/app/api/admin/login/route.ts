import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

function isHttps(request: Request): boolean {
  const proto = request.headers.get('x-forwarded-proto');
  if (proto) {
    const protocols = proto.split(',').map(p => p.trim().toLowerCase());
    if (protocols.includes('https')) return true;
  }
  return request.url.startsWith('https://');
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    console.log('=== ADMIN LOGIN API ===');
    console.log('1. Email received:', !!email, 'Password received:', !!password);

    if (!email || !password) {
      console.log('2. FAIL: Missing email or password');
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('3. Normalized email:', normalizedEmail);

    const admin = await prisma.internalAdmin.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });
    console.log('4. Admin found:', !!admin);

    if (!admin) {
      console.log('5. FAIL: Admin not found in InternalAdmin table');
      return NextResponse.json({ error: 'Platform admin account not found' }, { status: 401 });
    }

    console.log('6. Admin isActive:', admin.isActive);
    if (!admin.isActive) {
      console.log('7. FAIL: Admin is inactive');
      return NextResponse.json({ error: 'Account is inactive. Please contact support.' }, { status: 403 });
    }

    const passwordValid = await bcrypt.compare(password, admin.password);
    console.log('8. Password valid:', passwordValid);
    if (!passwordValid) {
      console.log('9. FAIL: Invalid password');
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    console.log('10. Password OK, updating lastLogin...');
    await prisma.internalAdmin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    // TEMP_ADMIN_AUTH: simple admin auth until full platform auth is rebuilt.
    const simpleData = {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      isAdmin: true,
    };

    const cookieValue = Buffer.from(JSON.stringify(simpleData)).toString('base64');
    console.log('11. Cookie value created, length:', cookieValue.length);

    const response = NextResponse.json({
      success: true,
      redirectUrl: '/admin',
    });

    const secure = isHttps(request);
    console.log('12. Cookie secure flag:', secure);

    response.cookies.set('simpleAdminAuth', cookieValue, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    console.log('13. simpleAdminAuth cookie set. Returning to client');
    return response;
  } catch (error) {
    console.error('ADMIN LOGIN ERROR:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Login failed: ' + message }, { status: 500 });
  }
}
