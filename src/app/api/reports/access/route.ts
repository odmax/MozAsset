import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getSessionUser() {
  const sessionCookie = cookies().get('session');
  if (sessionCookie?.value) {
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET() {
  const user = getSessionUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canAccess = ['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_MANAGER', 'EMPLOYEE'].includes(user.role);
  const plan = user.plan || 'FREE';
  
  return NextResponse.json({ 
    access: canAccess,
    role: user.role,
    plan,
    canAdvancedReports: true,
  });
}