import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { hashPassword } from '@/lib/auth/password'

/**
 * POST /api/admin/reset-password
 * Resets the password for admin@demo.com
 * 
 * This is a utility endpoint for development/testing
 * In production, this should be removed or protected
 */
export async function POST(request: NextRequest) {
  try {
    // For security, you might want to add a secret key check here
    // const secret = request.headers.get('x-reset-secret')
    // if (secret !== process.env.RESET_PASSWORD_SECRET) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const email = body.email || 'admin@demo.com'
    const password = body.password || 'Test@1234'

    console.log(`🔐 Resetting password for ${email}...`)

    // Hash the new password
    const hashedPassword = await hashPassword(password)

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Create user if doesn't exist
      console.log(`Creating user ${email}...`)
      
      // Find or create demo tenant
      const tenant = await prisma.tenant.upsert({
        where: { subdomain: 'demo' },
        update: {},
        create: {
          name: 'Demo Business Pvt Ltd',
          subdomain: 'demo',
          plan: 'professional',
          status: 'active',
          maxContacts: 1000,
          maxInvoices: 1000,
          maxUsers: 10,
          maxStorage: 10240,
          gstin: '29ABCDE1234F1Z5',
          address: '123 Business Park, MG Road',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
          country: 'India',
          phone: '+91-80-12345678',
          email: 'contact@demobusiness.com',
          website: 'https://demobusiness.com',
        },
      })

      await prisma.user.create({
        data: {
          email,
          name: 'Admin User',
          password: hashedPassword,
          role: 'owner',
          tenantId: tenant.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: `User ${email} created successfully`,
        email,
        password,
      })
    }

    // Update the password
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Password reset successfully for ${email}`,
      email,
      password,
    })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      {
        error: 'Failed to reset password',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
