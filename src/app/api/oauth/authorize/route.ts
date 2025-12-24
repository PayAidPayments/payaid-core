import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { verifyToken, signToken } from '@payaid/auth'
import { cache } from '@/lib/redis/client'
import crypto from 'crypto'

/**
 * GET /api/oauth/authorize
 * OAuth2 Authorization Endpoint
 * 
 * Generates an authorization code for the client to exchange for an access token.
 * 
 * Query Parameters:
 * - client_id: OAuth2 client ID
 * - redirect_uri: Where to redirect after authorization
 * - response_type: Must be "code"
 * - state: Optional state parameter for CSRF protection
 * - scope: Optional scope (default: "openid profile email")
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('client_id')
    const redirectUri = searchParams.get('redirect_uri')
    const responseType = searchParams.get('response_type')
    const state = searchParams.get('state')
    const scope = searchParams.get('scope') || 'openid profile email'
    
    // Validate client_id
    if (clientId !== process.env.OAUTH_CLIENT_ID) {
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Invalid client_id' },
        { status: 400 }
      )
    }
    
    // Validate response_type
    if (responseType !== 'code') {
      return NextResponse.json(
        { error: 'unsupported_response_type', error_description: 'Only "code" response type is supported' },
        { status: 400 }
      )
    }
    
    // Validate redirect_uri
    if (!redirectUri) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'redirect_uri is required' },
        { status: 400 }
      )
    }
    
    // Check if user is already logged in (check cookie)
    const token = request.cookies.get('payaid_token')?.value
    if (!token) {
      // Redirect to login page with return URL
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', request.url)
      return NextResponse.redirect(loginUrl)
    }
    
    // Verify token and get user
    try {
      const payload = verifyToken(token)
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: { tenant: true },
      })
      
      if (!user) {
        throw new Error('User not found')
      }
      
      // Generate authorization code
      const authCode = crypto.randomBytes(32).toString('hex')
      
      // Store code in Redis (5 minute expiry)
      await cache.set(
        `oauth:code:${authCode}`,
        JSON.stringify({
          userId: user.id,
          tenantId: user.tenantId,
          redirectUri,
          clientId,
          scope,
        }),
        300 // 5 minutes
      )
      
      // Redirect back to module with code
      const redirectUrl = new URL(redirectUri)
      redirectUrl.searchParams.set('code', authCode)
      if (state) {
        redirectUrl.searchParams.set('state', state)
      }
      
      return NextResponse.redirect(redirectUrl.toString())
    } catch (error) {
      // Token invalid or expired - redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', request.url)
      return NextResponse.redirect(loginUrl)
    }
  } catch (error) {
    console.error('OAuth authorize error:', error)
    return NextResponse.json(
      { error: 'server_error', error_description: 'An error occurred during authorization' },
      { status: 500 }
    )
  }
}
