import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { requireModuleAccess, handleLicenseError } from '@/lib/middleware/auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  avatar: z.string().url().optional(),
  password: z.string().min(8).optional(),
})

// GET /api/settings/profile - Get user profile
export async function GET(request: NextRequest) {
  try {
    // Check CRM module license (settings/profile is tenant-level, use CRM as base)
    const { userId } = await requireModuleAccess(request, 'crm')

    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
      },
    })

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(userProfile)
  } catch (error) {
    // Handle license errors
    if (error && typeof error === 'object' && 'moduleId' in error) {
      return handleLicenseError(error)
    }
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    )
  }
}

// PATCH /api/settings/profile - Update user profile
export async function PATCH(request: NextRequest) {
  try {
    // Check CRM module license (settings/profile is tenant-level, use CRM as base)
    const { userId } = await requireModuleAccess(request, 'crm')
    
    // Get current user to check email
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const validated = updateProfileSchema.parse(body)

    // Check if email is being updated and if it's already taken
    if (validated.email && validated.email !== currentUser.email) {
      const existing = await prisma.user.findUnique({
        where: { email: validated.email },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (validated.name) updateData.name = validated.name
    if (validated.email) updateData.email = validated.email
    if (validated.avatar) updateData.avatar = validated.avatar
    if (validated.password) {
      updateData.password = await bcrypt.hash(validated.password, 10)
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    // Handle license errors
    if (error && typeof error === 'object' && 'moduleId' in error) {
      return handleLicenseError(error)
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
