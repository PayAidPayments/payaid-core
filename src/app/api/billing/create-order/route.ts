import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { authenticateRequest } from '@/lib/middleware/auth'
import { getAdminPayAidConfig } from '@/lib/payments/get-admin-payment-config'
import { PayAidPayments } from '@/lib/payments/payaid'
import { z } from 'zod'

const createOrderSchema = z.object({
  items: z.array(z.object({
    type: z.enum(['module', 'bundle']),
    moduleId: z.string().optional(),
    bundleId: z.string().optional(),
    tier: z.enum(['starter', 'professional']).optional(),
    price: z.number().positive(),
  })),
  billingInfo: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    company: z.string().optional(),
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    gstNumber: z.string().optional(),
  }),
  total: z.number().positive(),
})

// POST /api/billing/create-order - Create a payment order
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validated = createOrderSchema.parse(body)

    const { tenantId, userId } = { tenantId: auth.tenantId || '', userId: auth.userId || '' }

    // Collect all module IDs from items
    const moduleIds: string[] = []
    for (const item of validated.items) {
      if (item.type === 'module' && item.moduleId) {
        moduleIds.push(item.moduleId)
      } else if (item.type === 'bundle' && item.bundleId) {
        // Get modules from bundle definition
        // For now, hardcode bundle modules
        const bundleModules: Record<string, string[]> = {
          starter: ['crm', 'invoicing'],
          professional: ['crm', 'invoicing', 'accounting', 'hr', 'whatsapp', 'analytics'],
          complete: ['crm', 'invoicing', 'accounting', 'hr', 'whatsapp', 'analytics'],
        }
        const modules = bundleModules[item.bundleId] || []
        moduleIds.push(...modules)
      }
    }

    // Calculate subtotal and tax
    const subtotal = validated.items.reduce((sum, item) => sum + item.price, 0)
    const tax = validated.total - subtotal

    // Create order record (using existing Order model)
    const order = await prisma.order.create({
      data: {
        tenantId: tenantId,
        orderNumber: `ORD-${Date.now()}`,
        subtotal: subtotal,
        tax: tax,
        shipping: 0,
        total: validated.total,
        status: 'pending',
        shippingAddress: validated.billingInfo.address,
        shippingCity: validated.billingInfo.city,
        shippingPostal: validated.billingInfo.postalCode,
        shippingCountry: 'India',
        // Store module info in metadata JSON field if it exists, or use notes
        notes: JSON.stringify({
          type: 'subscription',
          items: validated.items,
          moduleIds: [...new Set(moduleIds)],
          billingInfo: validated.billingInfo,
        }),
      },
    })

    // Get user info for payment
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    })

    // Create PayAid payment request using admin credentials
    // Admin credentials are used for platform payments (subscriptions, module purchases)
    const adminConfig = getAdminPayAidConfig()
    const payaid = new PayAidPayments(adminConfig)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    const itemNames = validated.items.map(i => i.name || i.moduleId || i.bundleId).join(', ')
    
    const paymentResponse = await payaid.getPaymentRequestUrl({
      order_id: order.orderNumber,
      amount: validated.total,
      currency: 'INR',
      description: `PayAid Subscription - ${itemNames}`,
      name: user?.name || validated.billingInfo.name,
      email: user?.email || validated.billingInfo.email,
      phone: validated.billingInfo.phone,
      address_line_1: validated.billingInfo.address,
      city: validated.billingInfo.city,
      state: validated.billingInfo.state,
      zip_code: validated.billingInfo.postalCode,
      country: 'India',
      return_url: `${baseUrl}/checkout/confirmation?orderId=${order.id}`,
      return_url_failure: `${baseUrl}/checkout/payment?error=payment_failed`,
      return_url_cancel: `${baseUrl}/checkout/cart`,
      udf1: order.id, // Store order ID
      udf2: tenantId, // Store tenant ID
      udf3: JSON.stringify(moduleIds), // Store module IDs
      expiry_in_minutes: 60, // Payment link expires in 1 hour
    })

    // Update order with payment UUID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        notes: JSON.stringify({
          type: 'subscription',
          items: validated.items,
          moduleIds: [...new Set(moduleIds)],
          billingInfo: validated.billingInfo,
          paymentUuid: paymentResponse.uuid,
        }),
      },
    })

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentUrl: paymentResponse.url,
      paymentUuid: paymentResponse.uuid,
      expiryDatetime: paymentResponse.expiry_datetime,
      amount: validated.total,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create order error:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}

