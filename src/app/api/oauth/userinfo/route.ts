import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@payaid/auth'
import { prisma } from '@payaid/db'

/**
 * GET /api/oauth/userinfo
 * OAuth2 UserInfo Endpoint
 * 
 * Returns user information based on the access token.
 * 
 * Headers:
 * - Authorization: Bearer <access_token>
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)
    
    try {
      const payload = verifyToken(token)
      
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: { tenant: true },
      })
      
      if (!user) {
        return NextResponse.json(
          { error: 'user_not_found', error_description: 'User not found' },
          { status: 404 }
        )
      }
      
      // Return user info according to OAuth2 UserInfo spec
      return NextResponse.json({
        sub: user.id,
        email: user.email,
        name: user.name,
        email_verified: user.emailVerified || false,
        role: user.role,
        tenant_id: user.tenantId,
        tenant_name: user.tenant?.name,
        tenant_subdomain: user.tenant?.subdomain,
        licensed_modules: user.tenant?.licensedModules || [],
        subscription_tier: user.tenant?.subscriptionTier || 'free',
      })
    } catch (error) {
      return NextResponse.json(
        { error: 'invalid_token', error_description: 'Invalid or expired token' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('OAuth userinfo error:', error)
    return NextResponse.json(
      { error: 'server_error', error_description: 'An error occurred while fetching user info' },
      { status: 500 }
    )
  }
}
