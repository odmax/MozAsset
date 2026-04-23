import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { createCheckoutSession, createPortalSession, cancelSubscription, getSubscriptionStatus, createCheckoutPayload, getPayfastBaseUrl } from '@/lib/billing';
import type { BillingProvider, Plan } from '@prisma/client';

function getSessionUser() {
  const sessionCookie = cookies().get('session');
  if (sessionCookie?.value) {
    try {
      return JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));
    } catch { return null; }
  }
  return null;
}

function getAdminSession() {
  const adminCookie = cookies().get('adminSession');
  if (adminCookie?.value) {
    try {
      return JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
    } catch { return null; }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const user = getSessionUser();
    const admin = getAdminSession();
    if (!user && !admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionUser = user || admin;
    const userId = sessionUser?.id;

    const { action, plan } = await request.json();

    switch (action) {
      case 'checkout': {
        if (!plan) {
          return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
        }

        if (plan !== 'PRO' && plan !== 'ENTERPRISE') {
          return NextResponse.json({ error: 'Invalid plan for checkout' }, { status: 400 });
        }

        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!dbUser) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const checkoutData = createCheckoutPayload(
          dbUser.id,
          dbUser.email,
          dbUser.name || 'Customer',
          plan as Plan
        );

        // Use redirect form (works in sandbox and live)
        const payfastUrl = `${getPayfastBaseUrl()}/eng/process`;

        return NextResponse.json({
          success: true,
          checkoutUrl: payfastUrl,
          checkoutData,
        });
      }

      case 'upgrade': {
        if (!plan) {
          return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
        }

        if (plan !== 'PRO' && plan !== 'ENTERPRISE') {
          return NextResponse.json({ 
            error: 'Invalid plan' ,
            contactUrl: '/contact'
          }, { status: 400 });
        }

        const provider = 'PAYSTACK' as BillingProvider;
        
        const result = await createCheckoutSession(userId, plan as Plan, provider);
        
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        await prisma.auditLog.create({
          data: {
            action: 'UPDATE',
            entityType: 'User',
            entityId: userId,
            userId: userId,
            changes: { plan: plan, action: 'upgrade_initiated' },
          },
        });

        return NextResponse.json(result);
      }

      case 'cancel': {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!dbUser || dbUser.plan === 'FREE') {
          return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
        }

        const result = await cancelSubscription(userId, dbUser.billingProvider as BillingProvider);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        await prisma.user.update({
          where: { id: userId },
          data: { 
            canceledAt: new Date(),
            subscriptionStatus: 'CANCELED',
          },
        });

        await prisma.auditLog.create({
          data: {
            action: 'UPDATE',
            entityType: 'User',
            entityId: userId,
            userId: userId,
            changes: { action: 'cancel_subscription' },
          },
        });

        return NextResponse.json({ success: true });
      }

      case 'portal': {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
        });

        const provider = dbUser?.billingProvider || 'PAYSTACK';
        const result = await createPortalSession(userId, provider as BillingProvider);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Billing API error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = getSessionUser();
    const admin = getAdminSession();
    if (!user && !admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionUser = user || admin;
    const userId = sessionUser?.id;

    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        subscriptionStatus: true,
        billingProvider: true,
        billingPeriodStart: true,
        billingPeriodEnd: true,
        canceledAt: true,
        assetLimit: true,
        departmentLimit: true,
        locationLimit: true,
        userLimit: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [assetCount, departmentCount, locationCount, userCount] = await Promise.all([
      prisma.asset.count(),
      prisma.department.count(),
      prisma.location.count(),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    let providerStatus = null;
    if (profile.billingProvider && profile.billingProvider !== 'NONE') {
      providerStatus = await getSubscriptionStatus(userId, profile.billingProvider as BillingProvider);
    }

    return NextResponse.json({
      ...profile,
      usage: {
        assets: assetCount,
        departments: departmentCount,
        locations: locationCount,
        users: userCount,
      },
      providerStatus,
    });
  } catch (error) {
    console.error('Billing GET error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
