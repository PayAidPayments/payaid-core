import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { cache } from '@/lib/cache/redis'

// GET /api/bundles - List all bundles with pricing
export async function GET(request: NextRequest) {
  try {
    const cacheKey = 'bundles:all'
    
    // Check cache
    const cached = await cache.get(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Get all modules for pricing calculation
    const modules = await prisma.moduleDefinition.findMany({
      where: { isActive: true },
      select: {
        moduleId: true,
        starterPrice: true,
        professionalPrice: true,
      },
    })

    // Create module price map
    const modulePrices = modules.reduce((acc, module) => {
      acc[module.moduleId] = {
        starter: Number(module.starterPrice),
        professional: Number(module.professionalPrice),
      }
      return acc
    }, {} as Record<string, { starter: number; professional: number }>)

    // Define bundles
    const bundles = [
      {
        id: 'starter',
        name: 'Starter Bundle',
        description: 'Perfect for small businesses getting started',
        modules: ['crm', 'invoicing'],
        tier: 'starter' as const,
        mostPopular: false,
      },
      {
        id: 'professional',
        name: 'Professional Bundle',
        description: 'Complete solution for growing businesses',
        modules: ['crm', 'invoicing', 'accounting', 'hr', 'whatsapp', 'analytics'],
        tier: 'professional' as const,
        mostPopular: true,
      },
      {
        id: 'complete',
        name: 'Complete Suite',
        description: 'Everything you need for enterprise operations',
        modules: ['crm', 'invoicing', 'accounting', 'hr', 'whatsapp', 'analytics'],
        tier: 'professional' as const,
        mostPopular: false,
      },
    ]

    // Calculate prices
    const bundlesWithPricing = bundles.map((bundle) => {
      const individualPrice = bundle.modules.reduce((total, moduleId) => {
        const prices = modulePrices[moduleId]
        if (prices) {
          return total + prices[bundle.tier]
        }
        return total
      }, 0)

      // Bundle discount: 15% for starter, 25% for professional
      const discount = bundle.tier === 'starter' ? 0.15 : 0.25
      const bundlePrice = Math.round(individualPrice * (1 - discount))
      const savings = individualPrice - bundlePrice

      return {
        ...bundle,
        individualPrice,
        bundlePrice,
        savings,
      }
    })

    const result = {
      bundles: bundlesWithPricing,
      count: bundlesWithPricing.length,
    }

    // Cache for 1 hour
    await cache.set(cacheKey, result, 3600)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get bundles error:', error)
    return NextResponse.json(
      { error: 'Failed to get bundles' },
      { status: 500 }
    )
  }
}

