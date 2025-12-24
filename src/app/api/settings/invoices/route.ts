import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { authenticateRequest } from '@/lib/middleware/auth'
import { z } from 'zod'

const invoiceSettingsSchema = z.object({
  template: z.string().default('standard'),
  defaultReverseCharge: z.boolean().default(false),
  showReverseCharge: z.boolean().default(true), // Show Reverse Charge option in invoice form
  defaultPaymentTerms: z.string().optional(),
  defaultNotes: z.string().optional(),
  invoicePrefix: z.string().default('INV'),
  autoGenerateNumber: z.boolean().default(true),
})

// GET /api/settings/invoices - Get invoice settings
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let tenant
    try {
      tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: {
          invoiceSettings: true,
        },
      })
    } catch (queryError: any) {
      // If error is about unknown field, the schema might not be migrated
      if (queryError?.message?.includes('Unknown argument') || 
          queryError?.message?.includes('invoiceSettings') ||
          queryError?.code === 'P2009') {
        console.error('Database schema may be out of sync. Please run: npx prisma db push')
        // Return default settings even if field doesn't exist
        return NextResponse.json({
          template: 'standard',
          defaultReverseCharge: false,
          showReverseCharge: true,
          defaultPaymentTerms: '',
          defaultNotes: '',
          invoicePrefix: 'INV',
          autoGenerateNumber: true,
        })
      }
      throw queryError
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Return default settings if none exist
    const settings = tenant.invoiceSettings as any || {
      template: 'standard',
      defaultReverseCharge: false,
      showReverseCharge: true,
      defaultPaymentTerms: '',
      defaultNotes: '',
      invoicePrefix: 'INV',
      autoGenerateNumber: true,
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Get invoice settings error:', error)
    return NextResponse.json(
      { error: 'Failed to get invoice settings' },
      { status: 500 }
    )
  }
}

// PATCH /api/settings/invoices - Update invoice settings
export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Log incoming data for debugging
    console.log('Updating invoice settings with data:', JSON.stringify(body, null, 2))
    
    let validated
    try {
      validated = invoiceSettingsSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('Invoice settings validation error:', validationError.errors)
        return NextResponse.json(
          { 
            error: 'Validation error', 
            message: 'Please check all fields are valid',
            details: validationError.errors 
          },
          { status: 400 }
        )
      }
      throw validationError
    }

    // Update tenant invoice settings
    // Try to update, but handle case where invoiceSettings field might not exist in DB
    let tenant
    try {
      tenant = await prisma.tenant.update({
        where: { id: user.tenantId },
        data: {
          invoiceSettings: validated,
        },
        select: {
          invoiceSettings: true,
        },
      })
    } catch (updateError: any) {
      // If error is about unknown field, the schema might not be migrated
      if (updateError?.message?.includes('Unknown argument') || 
          updateError?.message?.includes('invoiceSettings') ||
          updateError?.code === 'P2009') {
        console.error('Database schema may be out of sync. Please run: npx prisma db push')
        return NextResponse.json(
          { 
            error: 'Database schema out of sync',
            message: 'The invoiceSettings field may not exist in the database. Please run: npx prisma db push',
            code: updateError?.code,
          },
          { status: 500 }
        )
      }
      throw updateError
    }

    return NextResponse.json(tenant.invoiceSettings)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('Invoice settings validation error:', error.errors)
      return NextResponse.json(
        { 
          error: 'Validation error', 
          message: 'Please check all fields are valid',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    console.error('Update invoice settings error:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
      error: error,
    })
    
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = error?.code || error?.meta?.code
    
    return NextResponse.json(
      { 
        error: 'Failed to update invoice settings',
        message: errorMessage,
        code: errorCode,
        ...(process.env.NODE_ENV === 'development' && {
          stack: error instanceof Error ? error.stack : undefined,
          meta: error?.meta,
        })
      },
      { status: 500 }
    )
  }
}



