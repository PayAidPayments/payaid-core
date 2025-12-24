import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { comparePassword, signToken } from '@payaid/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = loginSchema.parse(body)

    // Find user with tenant and licensing info
    const user = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase().trim() },
      include: { 
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            plan: true,
            licensedModules: true,
            subscriptionTier: true,
          }
        }
      },
    })

    if (!user) {
      console.error('Login failed: User not found', { email: validated.email })
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!user.password) {
      console.error('Login failed: User has no password set', { email: validated.email, userId: user.id })
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await comparePassword(validated.password, user.password)
    if (!isValid) {
      console.error('Login failed: Invalid password', { email: validated.email, userId: user.id })
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    console.log('Login successful', { email: validated.email, userId: user.id })

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Generate JWT token with licensing info
    const token = signToken({
      userId: user.id,
      tenantId: user.tenantId || '',
      email: user.email,
      role: user.role,
      licensedModules: user.tenant?.licensedModules || [],
      subscriptionTier: user.tenant?.subscriptionTier || 'free',
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
      tenant: user.tenant ? {
        id: user.tenant.id,
        name: user.tenant.name,
        subdomain: user.tenant.subdomain,
        plan: user.tenant.plan,
        licensedModules: user.tenant.licensedModules || [],
        subscriptionTier: user.tenant.subscriptionTier || 'free',
      } : null,
      token,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
