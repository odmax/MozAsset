import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createCheckoutSession, createPortalSession, cancelSubscription, getSubscriptionStatus, createCheckoutPayload, getPayfastBaseUrl } from '@/lib/billing';
import type { BillingProvider, Plan } from '@prisma/client';
import { getCurrentUserContext } from '@/lib/user-context';
import { createNotification } from '@/lib/notifications';
import { sendNotificationEmail } from '@/lib/notification-email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = context.userId;

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

        createNotification({
          userId,
          type: 'PLAN_UPGRADED',
          title: 'Plan Upgrade Initiated',
          message: `Your upgrade to ${plan} plan has been initiated. Complete payment to activate`,
          link: '/billing',
        }).catch((err) => console.error('Failed to create notification:', err));

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
    const context = await getCurrentUserContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = context.userId;

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

    const where: any = {};
    if (!context.isInternalAdmin) {
      where.organizationId = context.organizationId || 'never-match';
    }

    const [assetCount, departmentCount, locationCount, userCount] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.department.count({ where }),
      prisma.location.count({ where }),
      prisma.user.count({ where: { ...where, isActive: true } }),
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
