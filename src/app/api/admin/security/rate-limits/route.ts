import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { apiLimiter, loginLimiter, bruteForceLimiter, uploadLimiter } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

function getAdminSession() {
  const cookieStore = cookies();
  const adminCookie = cookieStore.get('adminSession');
  if (adminCookie?.value) {
    try {
      return JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
    } catch { return null; }
  }
  return null;
}

export async function GET() {
  const admin = getAdminSession();
  if (!admin || !admin.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.id },
    select: { id: true, role: true, permissions: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'security:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const limiters = [apiLimiter, loginLimiter, bruteForceLimiter, uploadLimiter];

  const data = limiters.map((limiter) => {
    const allKeys = limiter.getAllKeys();
    const entries = Array.from(allKeys.entries()).map(([key, entry]) => ({
      key,
      requestCount: entry.timestamps.length,
      oldestTimestamp: entry.timestamps.length > 0 ? entry.timestamps[0] : null,
      newestTimestamp: entry.timestamps.length > 0 ? entry.timestamps[entry.timestamps.length - 1] : null,
    }));

    return {
      name: limiter.getName(),
      config: limiter.getConfig(),
      activeKeys: entries.length,
      entries,
    };
  });

  return NextResponse.json({ limiters: data });
}
