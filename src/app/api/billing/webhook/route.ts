import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { getAdminPayAidConfig } from '@/lib/payments/get-admin-payment-config'
import { PayAidPayments } from '@/lib/payments/payaid'

/**
 * POST /api/billing/webhook
 * Webhook endpoint for PayAid Payments subscription order payment callbacks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extract order info from UDF fields
    const orderId = body.udf1 // Order ID
    const tenantId = body.udf2 // Tenant ID
    const moduleIdsJson = body.udf3 // Module IDs JSON string
    const orderNumber = body.order_id
    const transactionId = body.transaction_id
    const responseCode = body.response_code
    const responseMessage = body.response_message

    if (!orderId && !orderNumber) {
      console.error('No order ID or order number in webhook')
      return NextResponse.json(
        { error: 'Missing order identifier' },
        { status: 400 }
      )
    }

    // Find order
    const order = await prisma.order.findFirst({
      where: orderId 
        ? { id: orderId }
        : { orderNumber: orderNumber },
      include: {
        tenant: true,
      },
    })

    if (!order) {
      console.error(`Order not found: ${orderId || orderNumber}`)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify webhook signature using admin credentials
    // Admin credentials are used for platform payments (subscriptions, module purchases)
    const adminConfig = getAdminPayAidConfig()
    const payaid = new PayAidPayments(adminConfig)
    if (!payaid.verifyWebhookSignature(body)) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse module IDs from UDF3
    let moduleIds: string[] = []
    try {
      if (moduleIdsJson) {
        moduleIds = JSON.parse(moduleIdsJson)
      } else {
        // Fallback: parse from order notes
        const notes = order.notes ? JSON.parse(order.notes) : {}
        moduleIds = notes.moduleIds || []
      }
    } catch (e) {
      console.error('Failed to parse module IDs:', e)
    }

    // Determine payment status
    let paymentStatus = 'pending'
    let orderStatus = order.status

    if (responseCode === 0) {
      // Payment successful
      paymentStatus = 'paid'
      orderStatus = 'confirmed'

      // Activate licenses
      const uniqueModuleIds = [...new Set(moduleIds)]
      
      // Update tenant's licensed modules
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId || order.tenantId },
        select: { licensedModules: true },
      })

      const currentModules = tenant?.licensedModules || []
      const updatedModules = [...new Set([...currentModules, ...uniqueModuleIds])]

      await prisma.tenant.update({
        where: { id: tenantId || order.tenantId },
        data: {
          licensedModules: updatedModules,
          subscriptionTier: 'professional', // Upgrade to professional on purchase
        },
      })

      // Create or update subscription
      const subscription = await prisma.subscription.upsert({
        where: { tenantId: tenantId || order.tenantId },
        update: {
          modules: updatedModules,
          tier: 'professional',
          monthlyPrice: order.total,
          billingCycleStart: new Date(),
          billingCycleEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: 'active',
        },
        create: {
          tenantId: tenantId || order.tenantId,
          modules: updatedModules,
          tier: 'professional',
          monthlyPrice: order.total,
          billingCycleStart: new Date(),
          billingCycleEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: 'active',
        },
      })

      // Update order
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: orderStatus,
          paidAt: new Date(),
        },
      })

      // Send confirmation email
      try {
        const { sendOrderConfirmationEmail } = await import('@/lib/email/order-confirmation')
        const user = await prisma.user.findFirst({
          where: { tenantId: tenantId || order.tenantId },
          select: { name: true, email: true },
        })
        
        if (user) {
          await sendOrderConfirmationEmail({
            orderNumber: order.orderNumber,
            customerName: user.name || 'Customer',
            customerEmail: user.email,
            amount: order.total,
            modules: updatedModules,
            orderDate: new Date().toISOString(),
          })
        }
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError)
        // Don't fail the webhook if email fails
      }

      console.log(`✅ License activated for tenant ${tenantId || order.tenantId}:`, updatedModules)
    } else if (responseCode === 1043) {
      // Payment cancelled
      paymentStatus = 'cancelled'
      orderStatus = 'cancelled'
    } else {
      // Payment failed
      paymentStatus = 'failed'
      orderStatus = 'cancelled'
    }

    // Update order with payment info
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: orderStatus,
        notes: JSON.stringify({
          ...(order.notes ? JSON.parse(order.notes) : {}),
          paymentStatus,
          transactionId,
          responseCode,
          responseMessage,
          paymentDatetime: body.payment_datetime || new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: orderStatus,
      paymentStatus,
    })
  } catch (error) {
    console.error('Billing webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

