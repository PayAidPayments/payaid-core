import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { authenticateRequest } from '@/lib/middleware/auth'

// GET /api/billing/orders/[orderId] - Get order details
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            licensedModules: true,
            subscriptionTier: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify order belongs to user's tenant
    if (order.tenantId !== auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Parse order notes for subscription info
    let subscriptionInfo: any = {}
    try {
      if (order.notes) {
        subscriptionInfo = JSON.parse(order.notes)
      }
    } catch (e) {
      // Ignore parse errors
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      subtotal: order.subtotal,
      tax: order.tax,
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt?.toISOString(),
      modules: subscriptionInfo.moduleIds || [],
      items: subscriptionInfo.items || [],
    })
  } catch (error) {
    console.error('Get order error:', error)
    return NextResponse.json(
      { error: 'Failed to get order' },
      { status: 500 }
    )
  }
}

