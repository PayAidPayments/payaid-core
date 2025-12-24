import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { verifyToken } from '@/lib/auth/jwt'
import { z } from 'zod'

const updateModulesSchema = z.object({
  licensedModules: z.array(z.string()),
})

// PATCH /api/admin/tenants/[tenantId]/modules
// Update tenant's licensed modules (admin only)
// NOTE: This route does NOT require module access - it's used to activate modules!
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> | { tenantId: string } }
) {
  try {
    // Handle Next.js 15+ async params
    const resolvedParams = await Promise.resolve(params)
    const tenantId = resolvedParams.tenantId
    // Check authentication only (no module check - this route is for activating modules!)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let payload
    try {
      payload = verifyToken(token)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    if (!payload.userId || !payload.tenantId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = payload.userId
    const authTenantId = payload.tenantId

    // Verify user is admin/owner
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (user?.role !== 'owner' && user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    // Verify tenant ID matches (or allow super admin to update any tenant)
    if (authTenantId !== tenantId && user?.role !== 'owner') {
      return NextResponse.json(
        { error: 'Unauthorized: Cannot modify other tenants' },
        { status: 403 }
      )
    }

    // Validate tenant ID exists
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    // Check if tenant exists before updating
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    })

    if (!existingTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validated = updateModulesSchema.parse(body)

    // Validate licensedModules array
    if (!Array.isArray(validated.licensedModules)) {
      return NextResponse.json(
        { error: 'licensedModules must be an array' },
        { status: 400 }
      )
    }

    // Update tenant's licensed modules
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        licensedModules: validated.licensedModules,
      },
      select: {
        id: true,
        name: true,
        licensedModules: true,
        subscriptionTier: true,
      },
    })

    return NextResponse.json({
      success: true,
      tenant: updated,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    // Log detailed error for debugging
    console.error('Update modules error:', error)
    
    // Check for database connection errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isDatabaseError = errorMessage.includes('database') || 
                           errorMessage.includes('connection') ||
                           errorMessage.includes('credentials') ||
                           errorMessage.includes('authentication failed')
    
    // Return more detailed error message
    return NextResponse.json(
      { 
        error: isDatabaseError ? 'Database connection error' : 'Failed to update modules',
        message: isDatabaseError 
          ? 'Database connection failed. Please check your DATABASE_URL configuration.'
          : errorMessage,
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error instanceof Error ? error.stack : undefined,
          originalError: errorMessage 
        }),
      },
      { status: 500 }
    )
  }
}

// GET /api/admin/tenants/[tenantId]/modules
// Get tenant's licensed modules
// NOTE: This route does NOT require module access - it's used to check module status!
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> | { tenantId: string } }
) {
  try {
    // Handle Next.js 15+ async params
    const resolvedParams = await Promise.resolve(params)
    const tenantId = resolvedParams.tenantId

    // Check authentication only (no module check - this route is for checking module status!)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let payload
    try {
      payload = verifyToken(token)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    if (!payload.tenantId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const authTenantId = payload.tenantId

    // Verify tenant ID matches
    if (authTenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        licensedModules: true,
        subscriptionTier: true,
      },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      licensedModules: tenant.licensedModules || [],
      subscriptionTier: tenant.subscriptionTier || 'free',
    })
  } catch (error) {
    console.error('Get modules error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isDatabaseError = errorMessage.includes('database') || 
                           errorMessage.includes('connection') ||
                           errorMessage.includes('credentials') ||
                           errorMessage.includes('authentication failed')
    
    return NextResponse.json(
      { 
        error: isDatabaseError ? 'Database connection error' : 'Failed to get modules',
        message: isDatabaseError 
          ? 'Database connection failed. Please check your DATABASE_URL configuration.'
          : errorMessage,
      },
      { status: 500 }
    )
  }
}
