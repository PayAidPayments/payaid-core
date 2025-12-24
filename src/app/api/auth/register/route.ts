import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { hashPassword, signToken } from '@payaid/auth'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  tenantName: z.string().min(1),
  subdomain: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = registerSchema.parse(body)

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Check if subdomain is available
    const existingTenant = await prisma.tenant.findUnique({
      where: { subdomain: validated.subdomain },
    })

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Subdomain already taken' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(validated.password)

    // Create tenant and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: validated.tenantName,
          subdomain: validated.subdomain,
          plan: 'free',
          status: 'active',
          maxContacts: 50,
          maxInvoices: 10,
          maxUsers: 1,
          maxStorage: 1024, // 1GB
        },
      })

      // Create user
      const user = await tx.user.create({
        data: {
          email: validated.email,
          name: validated.name,
          password: hashedPassword,
          role: 'owner',
          tenantId: tenant.id,
        },
      })

      return { tenant, user }
    })

    // Generate JWT token
    const token = signToken({
      userId: result.user.id,
      tenantId: result.tenant.id,
      email: result.user.email,
      role: result.user.role,
      licensedModules: [],
      subscriptionTier: 'free',
    })

    return NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        subdomain: result.tenant.subdomain,
        plan: result.tenant.plan,
      },
      token,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
