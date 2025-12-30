import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { authenticateRequest } from '@/lib/middleware/auth'
import { z } from 'zod'

const updateTenantSchema = z.object({
  licensedModules: z.array(z.string()).optional(),
  subscriptionTier: z.enum(['free', 'starter', 'professional', 'enterprise']).optional(),
  status: z.enum(['active', 'suspended', 'cancelled']).optional(),
})

// GET /api/admin/tenants/[tenantId] - Get tenant details
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
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

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.tenantId },
      include: {
        subscription: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            contacts: true,
            invoices: true,
            employees: true,
            orders: true,
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

    // Get payment history
    const orders = await prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        status: 'confirmed',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        total: true,
        createdAt: true,
        paidAt: true,
      },
    })

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        subdomain: tenant.subdomain,
        status: tenant.status,
        subscriptionTier: tenant.subscriptionTier,
        licensedModules: tenant.licensedModules,
        createdAt: tenant.createdAt.toISOString(),
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
      users: tenant.users,
      usage: {
        contacts: tenant._count.contacts,
        invoices: tenant._count.invoices,
        employees: tenant._count.employees,
        orders: tenant._count.orders,
        users: tenant.users.length,
      },
      paymentHistory: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        amount: order.total,
        date: order.createdAt.toISOString(),
        paidAt: order.paidAt?.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Get tenant error:', error)
    return NextResponse.json(
      { error: 'Failed to get tenant details' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/tenants/[tenantId] - Update tenant (add/remove modules, change tier)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
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

    const body = await request.json()
    const validated = updateTenantSchema.parse(body)

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.tenantId },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Update tenant
    const updateData: any = {}
    if (validated.licensedModules !== undefined) {
      updateData.licensedModules = validated.licensedModules
    }
    if (validated.subscriptionTier !== undefined) {
      updateData.subscriptionTier = validated.subscriptionTier
    }
    if (validated.status !== undefined) {
      updateData.status = validated.status
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: params.tenantId },
      data: updateData,
    })

    // Update subscription if modules changed
    if (validated.licensedModules !== undefined) {
      await prisma.subscription.upsert({
        where: { tenantId: params.tenantId },
        update: {
          modules: validated.licensedModules,
          tier: validated.subscriptionTier || tenant.subscriptionTier,
        },
        create: {
          tenantId: params.tenantId,
          modules: validated.licensedModules,
          tier: validated.subscriptionTier || tenant.subscriptionTier,
          monthlyPrice: 0, // Admin-added modules might be free
          billingCycleStart: new Date(),
          billingCycleEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
        },
      })
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: updatedTenant.id,
        licensedModules: updatedTenant.licensedModules,
        subscriptionTier: updatedTenant.subscriptionTier,
        status: updatedTenant.status,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Update tenant error:', error)
    return NextResponse.json(
      { error: 'Failed to update tenant' },
      { status: 500 }
    )
  }
}

