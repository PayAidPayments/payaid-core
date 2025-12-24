import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { signToken } from '@payaid/auth'
import { cache } from '@/lib/redis/client'
import crypto from 'crypto'

/**
 * POST /api/oauth/token
 * OAuth2 Token Endpoint
 * 
 * Exchanges an authorization code for an access token.
 * 
 * Body:
 * - grant_type: Must be "authorization_code"
 * - code: Authorization code from /authorize endpoint
 * - redirect_uri: Must match the redirect_uri used in authorization
 * - client_id: OAuth2 client ID
 * - client_secret: OAuth2 client secret
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { grant_type, code, redirect_uri, client_id, client_secret } = body
    
    // Handle refresh token grant
    if (grant_type === 'refresh_token') {
      const refresh_token = body.refresh_token
      
      if (!refresh_token) {
        return NextResponse.json(
          { error: 'invalid_request', error_description: 'Refresh token is required' },
          { status: 400 }
        )
      }
      
      // Validate client credentials
      if (client_id !== process.env.OAUTH_CLIENT_ID ||
          client_secret !== process.env.OAUTH_CLIENT_SECRET) {
        return NextResponse.json(
          { error: 'invalid_client', error_description: 'Invalid client credentials' },
          { status: 401 }
        )
      }
      
      // Get refresh token from Redis
      const refreshData = await cache.get<{
        userId: string
        tenantId: string
        clientId: string
      }>(`oauth:refresh:${refresh_token}`)
      
      if (!refreshData) {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'Refresh token is invalid or expired' },
          { status: 400 }
        )
      }
      
      // Get user and tenant
      const user = await prisma.user.findUnique({
        where: { id: refreshData.userId },
        include: { tenant: true },
      })
      
      if (!user) {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'User not found' },
          { status: 400 }
        )
      }
      
      // Generate new access token
      const newToken = signToken({
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
        licensedModules: user.tenant.licensedModules || [],
        subscriptionTier: user.tenant.subscriptionTier || 'free',
      })
      
      // Generate new refresh token (rotate refresh token)
      const newRefreshToken = crypto.randomBytes(32).toString('hex')
      
      // Delete old refresh token
      await cache.delete(`oauth:refresh:${refresh_token}`)
      
      // Store new refresh token
      await cache.set(
        `oauth:refresh:${newRefreshToken}`,
        JSON.stringify({
          userId: user.id,
          tenantId: user.tenantId,
          clientId: client_id,
        }),
        60 * 60 * 24 * 30 // 30 days
      )
      
      return NextResponse.json({
        access_token: newToken,
        token_type: 'Bearer',
        expires_in: 86400, // 24 hours
        refresh_token: newRefreshToken,
      })
    }
    
    // Handle authorization code grant
    if (grant_type !== 'authorization_code') {
      return NextResponse.json(
        { error: 'unsupported_grant_type', error_description: 'Only "authorization_code" and "refresh_token" grant types are supported' },
        { status: 400 }
      )
    }
    
    // Validate client credentials
    if (client_id !== process.env.OAUTH_CLIENT_ID ||
        client_secret !== process.env.OAUTH_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Invalid client credentials' },
        { status: 401 }
      )
    }
    
    // Validate code
    if (!code) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Authorization code is required' },
        { status: 400 }
      )
    }
    
    // Get authorization code from Redis
    const codeData = await cache.get<{
      userId: string
      tenantId: string
      redirectUri: string
      clientId: string
      scope: string
    }>(`oauth:code:${code}`)
    
    if (!codeData) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Authorization code is invalid or expired' },
        { status: 400 }
      )
    }
    
    // Validate redirect_uri matches
    if (redirect_uri !== codeData.redirectUri) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'redirect_uri does not match' },
        { status: 400 }
      )
    }
    
    // Delete code (one-time use)
    await cache.delete(`oauth:code:${code}`)
    
    // Get user and tenant
    const user = await prisma.user.findUnique({
      where: { id: codeData.userId },
      include: { tenant: true },
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'User not found' },
        { status: 400 }
      )
    }
    
    // Generate JWT token
    const token = signToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      licensedModules: user.tenant.licensedModules || [],
      subscriptionTier: user.tenant.subscriptionTier || 'free',
    })
    
    // Generate refresh token
    const refreshToken = crypto.randomBytes(32).toString('hex')
    
    // Store refresh token in Redis (30 days expiry)
    await cache.set(
      `oauth:refresh:${refreshToken}`,
      JSON.stringify({
        userId: user.id,
        tenantId: user.tenantId,
        clientId: client_id,
      }),
      60 * 60 * 24 * 30 // 30 days
    )
    
    // Return token
    return NextResponse.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 86400, // 24 hours
      refresh_token: refreshToken,
      scope: codeData.scope,
    })
  } catch (error) {
    console.error('OAuth token error:', error)
    return NextResponse.json(
      { error: 'server_error', error_description: 'An error occurred during token exchange' },
      { status: 500 }
    )
  }
}
