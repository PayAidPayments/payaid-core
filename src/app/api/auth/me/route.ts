import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@payaid/auth'
import { prisma } from '@payaid/db'

export async function GET(request: NextRequest) {
  try {
    // Fast JWT verification without database query
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

    if (!payload.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Fetch user with tenant - optimized with timeout
    const userData = await Promise.race([
      prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              subdomain: true,
              plan: true,
              status: true,
              licensedModules: true,
              subscriptionTier: true,
              maxContacts: true,
              maxInvoices: true,
              maxUsers: true,
              maxStorage: true,
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          createdAt: true,
          lastLoginAt: true,
          tenant: true,
        },
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 2000)
      ),
    ]) as any

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify tenantId from token matches database tenant
    if (payload.tenantId && userData.tenant?.id && payload.tenantId !== userData.tenant.id) {
      console.warn(`Tenant ID mismatch: Token has ${payload.tenantId}, DB has ${userData.tenant.id}`)
    }

    // Use licensed modules from database (source of truth), not token
    if (userData.tenant) {
      userData.tenant = {
        ...userData.tenant,
        licensedModules: userData.tenant.licensedModules || [],
        subscriptionTier: userData.tenant.subscriptionTier || 'free',
      }
    }

    return NextResponse.json(userData)
  } catch (error) {
    console.error('Get user error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get user'
    const statusCode = errorMessage.includes('timeout') ? 504 : 500
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
