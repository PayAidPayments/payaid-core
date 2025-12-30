import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { authenticateRequest } from '@/lib/middleware/auth'
import { z } from 'zod'

const createCouponSchema = z.object({
  code: z.string().min(3).max(20),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  maxUses: z.number().int().positive().optional(),
  applicableModules: z.array(z.string()).optional(),
  minAmount: z.number().positive().optional(),
})

// GET /api/admin/coupons - List all coupons
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

    // For now, coupons are stored in a simple structure
    // In production, you'd have a Coupon table
    const coupons: any[] = [
      // Example coupons - in production, fetch from database
    ]

    return NextResponse.json({
      coupons,
      count: coupons.length,
    })
  } catch (error) {
    console.error('Get coupons error:', error)
    return NextResponse.json(
      { error: 'Failed to get coupons' },
      { status: 500 }
    )
  }
}

// POST /api/admin/coupons - Create a new coupon
export async function POST(request: NextRequest) {
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
    const validated = createCouponSchema.parse(body)

    // TODO: Create coupon in database
    // For now, return success
    const coupon = {
      id: `coupon-${Date.now()}`,
      ...validated,
      uses: 0,
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      coupon,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create coupon error:', error)
    return NextResponse.json(
      { error: 'Failed to create coupon' },
      { status: 500 }
    )
  }
}

