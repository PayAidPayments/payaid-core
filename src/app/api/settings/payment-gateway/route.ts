import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { authenticateRequest } from '@/lib/middleware/auth'
import { encrypt } from '@/lib/encryption'
import { z } from 'zod'

const updatePaymentGatewaySchema = z.object({
  payaidApiKey: z.string().min(1).optional(),
  payaidSalt: z.string().min(1).optional(),
  payaidBaseUrl: z.string().url().optional(),
  payaidEncryptionKey: z.string().optional(),
  payaidDecryptionKey: z.string().optional(),
  payaidWebhookSecret: z.string().optional(),
  isActive: z.boolean().optional(),
  testMode: z.boolean().optional(),
})

/**
 * GET /api/settings/payment-gateway
 * Get tenant's payment gateway settings (sensitive fields are encrypted)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.tenantPaymentSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: {
        id: true,
        payaidApiKey: true, // API key is not encrypted (it's public)
        payaidSalt: true, // Encrypted in DB, but we'll show masked version
        payaidBaseUrl: true,
        payaidEncryptionKey: true, // Encrypted in DB
        payaidDecryptionKey: true, // Encrypted in DB
        payaidWebhookSecret: true, // Encrypted in DB
        isConfigured: true,
        isActive: true,
        testMode: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!settings) {
      return NextResponse.json({
        isConfigured: false,
        isActive: false,
        testMode: false,
      })
    }

    // Return settings with masked sensitive fields
    return NextResponse.json({
      ...settings,
      payaidApiKey: settings.payaidApiKey
        ? `${settings.payaidApiKey.slice(0, 8)}...${settings.payaidApiKey.slice(-4)}`
        : null,
      payaidSalt: settings.payaidSalt ? '••••••••' : null, // Always mask
      payaidEncryptionKey: settings.payaidEncryptionKey ? '••••••••' : null,
      payaidDecryptionKey: settings.payaidDecryptionKey ? '••••••••' : null,
      payaidWebhookSecret: settings.payaidWebhookSecret ? '••••••••' : null,
    })
  } catch (error) {
    console.error('Get payment gateway settings error:', error)
    return NextResponse.json(
      { error: 'Failed to get payment gateway settings' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/settings/payment-gateway
 * Update tenant's payment gateway settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = updatePaymentGatewaySchema.parse(body)

    // Check if settings exist
    const existing = await prisma.tenantPaymentSettings.findUnique({
      where: { tenantId: user.tenantId },
    })

    // Prepare update data with encryption for sensitive fields
    const updateData: any = {}

    if (validated.payaidApiKey !== undefined) {
      updateData.payaidApiKey = validated.payaidApiKey
    }

    if (validated.payaidSalt !== undefined) {
      // Encrypt SALT before storing
      updateData.payaidSalt = encrypt(validated.payaidSalt)
    }

    if (validated.payaidBaseUrl !== undefined) {
      updateData.payaidBaseUrl = validated.payaidBaseUrl
    }

    if (validated.payaidEncryptionKey !== undefined) {
      // Encrypt encryption key before storing
      updateData.payaidEncryptionKey = validated.payaidEncryptionKey
        ? encrypt(validated.payaidEncryptionKey)
        : null
    }

    if (validated.payaidDecryptionKey !== undefined) {
      // Encrypt decryption key before storing
      updateData.payaidDecryptionKey = validated.payaidDecryptionKey
        ? encrypt(validated.payaidDecryptionKey)
        : null
    }

    if (validated.payaidWebhookSecret !== undefined) {
      // Encrypt webhook secret before storing
      updateData.payaidWebhookSecret = validated.payaidWebhookSecret
        ? encrypt(validated.payaidWebhookSecret)
        : null
    }

    if (validated.isActive !== undefined) {
      updateData.isActive = validated.isActive
    }

    if (validated.testMode !== undefined) {
      updateData.testMode = validated.testMode
    }

    // Determine if configured (at minimum, need API key, SALT, and base URL)
    const isConfigured =
      (validated.payaidApiKey !== undefined && validated.payaidApiKey) ||
      (existing?.payaidApiKey && validated.payaidApiKey === undefined)
        ? (validated.payaidSalt !== undefined && validated.payaidSalt) ||
          (existing?.payaidSalt && validated.payaidSalt === undefined)
          ? (validated.payaidBaseUrl !== undefined && validated.payaidBaseUrl) ||
            (existing?.payaidBaseUrl && validated.payaidBaseUrl === undefined)
          : false
        : false

    updateData.isConfigured = isConfigured

    let settings

    if (existing) {
      // Update existing settings
      settings = await prisma.tenantPaymentSettings.update({
        where: { tenantId: user.tenantId },
        data: updateData,
      })
    } else {
      // Create new settings
      settings = await prisma.tenantPaymentSettings.create({
        data: {
          tenantId: user.tenantId,
          ...updateData,
        },
      })
    }

    // Return settings with masked sensitive fields
    return NextResponse.json({
      ...settings,
      payaidApiKey: settings.payaidApiKey
        ? `${settings.payaidApiKey.slice(0, 8)}...${settings.payaidApiKey.slice(-4)}`
        : null,
      payaidSalt: settings.payaidSalt ? '••••••••' : null,
      payaidEncryptionKey: settings.payaidEncryptionKey ? '••••••••' : null,
      payaidDecryptionKey: settings.payaidDecryptionKey ? '••••••••' : null,
      payaidWebhookSecret: settings.payaidWebhookSecret ? '••••••••' : null,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Update payment gateway settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update payment gateway settings' },
      { status: 500 }
    )
  }
}
