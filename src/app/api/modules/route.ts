import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@payaid/db'
import { cache } from '@/lib/cache/redis'

// GET /api/modules - List all active modules
export async function GET(request: NextRequest) {
  try {
    const cacheKey = 'modules:all:active'
    
    // Check cache
    const cached = await cache.get(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const modules = await prisma.moduleDefinition.findMany({
      where: { isActive: true },
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        moduleId: true,
        displayName: true,
        description: true,
        icon: true,
        starterPrice: true,
        professionalPrice: true,
        enterprisePrice: true,
        features: true,
        isActive: true,
      },
    })

    // Format prices as numbers
    const formattedModules = modules.map((module) => ({
      ...module,
      starterPrice: Number(module.starterPrice),
      professionalPrice: Number(module.professionalPrice),
      enterprisePrice: module.enterprisePrice ? Number(module.enterprisePrice) : null,
    }))

    const result = {
      modules: formattedModules,
      count: formattedModules.length,
    }

    // Cache for 1 hour
    await cache.set(cacheKey, result, 3600)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get modules error:', error)
    return NextResponse.json(
      { error: 'Failed to get modules' },
      { status: 500 }
    )
  }
}

