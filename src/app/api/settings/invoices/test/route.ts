import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { authenticateRequest } from '@/lib/middleware/auth'

// GET /api/settings/invoices/test - Test invoice settings database access
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Test 1: Check if invoiceSettings field exists in Prisma client
    const hasInvoiceSettingsField = 'invoiceSettings' in (prisma.tenant as any).fields || false
    
    // Test 2: Try to query tenant with invoiceSettings
    let queryWorks = false
    let queryError: string | null = null
    
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: {
          invoiceSettings: true,
        },
      })
      queryWorks = true
    } catch (err: any) {
      queryError = err?.message || String(err)
    }

    // Test 3: Try raw SQL query to check if column exists
    let columnExists = false
    let rawQueryError: string | null = null
    
    try {
      const result = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Tenant' 
        AND column_name = 'invoiceSettings'
      `
      columnExists = (result as any[]).length > 0
    } catch (err: any) {
      rawQueryError = err?.message || String(err)
    }

    // Test 4: Try to update invoiceSettings
    let updateWorks = false
    let updateError: string | null = null
    
    try {
      await prisma.tenant.update({
        where: { id: user.tenantId },
        data: {
          invoiceSettings: { test: true },
        },
        select: {
          invoiceSettings: true,
        },
      })
      updateWorks = true
    } catch (err: any) {
      updateError = err?.message || String(err)
    }

    return NextResponse.json({
      tenantId: user.tenantId,
      tests: {
        prismaClientHasField: hasInvoiceSettingsField,
        queryWorks,
        queryError,
        columnExists,
        rawQueryError,
        updateWorks,
        updateError,
      },
      recommendation: !queryWorks || !updateWorks
        ? 'Run: npx prisma db push (then restart dev server and run: npx prisma generate)'
        : 'Invoice settings field is working correctly',
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}



