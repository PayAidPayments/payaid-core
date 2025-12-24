import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { authenticateRequest } from '@/lib/middleware/auth'

// GET /api/admin/tenants - List all tenants with subscription info
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: auth.userId || '' },
      select: { role: true },
    })

    if (user?.role !== 'admin' && user?.role !== 'owner') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const tier = searchParams.get('tier')

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { subdomain: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (tier) {
      where.subscriptionTier = tier
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
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
          _count: {
            select: {
              users: true,
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          subdomain: true,
          status: true,
          subscriptionTier: true,
          licensedModules: true,
          createdAt: true,
          subscription: true,
          _count: true,
        },
      }),
      prisma.tenant.count({ where }),
    ])

    // Calculate monthly revenue per tenant
    const tenantsWithRevenue = tenants.map((tenant) => {
      const monthlyRevenue = tenant.subscription
        ? Number(tenant.subscription.monthlyPrice)
        : 0

      return {
        ...tenant,
        monthlyRevenue,
        userCount: tenant._count.users,
      }
    })

    return NextResponse.json({
      tenants: tenantsWithRevenue,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get tenants error:', error)
    return NextResponse.json(
      { error: 'Failed to get tenants' },
      { status: 500 }
    )
  }
}

