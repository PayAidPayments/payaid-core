/**
 * Redis Client for Core Module
 * 
 * Used for OAuth2 authorization code storage
 * This is a copy of the main redis client, adapted for core module
 */

import Redis from 'ioredis'

let redis: Redis | null = null
let errorLogged = false
let isConnected = false

export function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) {
          return null
        }
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      reconnectOnError() {
        return false
      },
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 2000,
      commandTimeout: 1000,
      enableAutoPipelining: false,
    })

    redis.on('error', (err) => {
      if (!errorLogged) {
        console.warn('⚠️ Redis not available (OAuth2 codes will not persist). To enable, start Redis:', err.message)
        errorLogged = true
      }
      isConnected = false
    })

    redis.on('connect', () => {
      if (!isConnected) {
        console.log('✅ Redis Client Connected (Core Module)')
        isConnected = true
        errorLogged = false
      }
    })

    redis.on('ready', () => {
      console.log('✅ Redis Client Ready (Core Module)')
      isConnected = true
    })

    redis.on('close', () => {
      isConnected = false
    })
  }

  return redis
}

export async function closeRedisConnection() {
  if (redis) {
    await redis.quit()
    redis = null
  }
}

// Cache helper for OAuth2 codes
export class Cache {
  private client: Redis

  constructor() {
    this.client = getRedisClient()
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await Promise.race([
        this.client.get(key),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 100)),
      ])
      return value ? JSON.parse(value) : null
    } catch (error) {
      return null
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value)
      await Promise.race([
        ttlSeconds 
          ? this.client.setex(key, ttlSeconds, serialized)
          : this.client.set(key, serialized),
        new Promise<void>((resolve) => setTimeout(() => resolve(), 100)),
      ])
    } catch (error) {
      // Silently fail - Redis is optional
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key)
    } catch (error) {
      // Silently fail
    }
  }
}

export const cache = new Cache()
