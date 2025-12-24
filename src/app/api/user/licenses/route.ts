import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { authenticateRequest } from '@/lib/middleware/auth'

// GET /api/user/licenses - Get user's licensed modules
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const tenantId = auth.tenantId || ''

    // Get tenant with subscription
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
      },
      select: {
        id: true,
        name: true,
        licensedModules: true,
        subscriptionTier: true,
        subscription: {
          select: {
            id: true,
            modules: true,
            tier: true,
            monthlyPrice: true,
            billingCycleStart: true,
            billingCycleEnd: true,
            status: true,
          },
        },
      },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        licensedModules: tenant.licensedModules || [],
        subscriptionTier: tenant.subscriptionTier,
      },
      subscription: tenant.subscription ? {
        id: tenant.subscription.id,
        modules: tenant.subscription.modules,
        tier: tenant.subscription.tier,
        monthlyPrice: Number(tenant.subscription.monthlyPrice),
        billingCycleStart: tenant.subscription.billingCycleStart.toISOString(),
        billingCycleEnd: tenant.subscription.billingCycleEnd.toISOString(),
        status: tenant.subscription.status,
      } : null,
    })
  } catch (error) {
    console.error('Get user licenses error:', error)
    return NextResponse.json(
      { error: 'Failed to get licenses' },
      { status: 500 }
    )
  }
}

