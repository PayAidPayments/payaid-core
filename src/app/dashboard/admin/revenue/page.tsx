'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth'

interface RevenueMetrics {
  mrr: number
  arr: number
  customerCount: number
  churnRate: number
  expansionRevenue: number
  revenueByModule: Record<string, number>
  revenueByTier: Record<string, number>
  mrrGrowth: Array<{ month: string; mrr: number }>
}

export default function RevenueDashboardPage() {
  const { token } = useAuthStore()
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return

    fetch('/api/admin/revenue', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Failed to load revenue metrics</p>
      </div>
    )
  }

  const moduleIcons: Record<string, string> = {
    crm: '👥',
    invoicing: '📄',
    accounting: '💰',
    hr: '👔',
    whatsapp: '💬',
    analytics: '📊',
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Revenue Dashboard</h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-2">Monthly Recurring Revenue</p>
            <p className="text-3xl font-bold text-gray-900">₹{metrics.mrr.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">MRR</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-2">Annual Recurring Revenue</p>
            <p className="text-3xl font-bold text-gray-900">₹{metrics.arr.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">ARR</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-2">Total Customers</p>
            <p className="text-3xl font-bold text-gray-900">{metrics.customerCount}</p>
            <p className="text-xs text-gray-500 mt-1">Active Subscriptions</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-2">Churn Rate</p>
            <p className="text-3xl font-bold text-gray-900">{metrics.churnRate}%</p>
            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
          </div>
        </div>

        {/* Revenue by Module */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue by Module</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(metrics.revenueByModule).map(([module, revenue]) => (
              <div key={module} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">{moduleIcons[module] || '📦'}</div>
                <p className="text-sm font-semibold text-gray-700 uppercase">{module}</p>
                <p className="text-lg font-bold text-gray-900">₹{revenue.toLocaleString()}</p>
                <p className="text-xs text-gray-500">/month</p>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Tier */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue by Tier</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(metrics.revenueByTier).map(([tier, revenue]) => (
              <div key={tier} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 capitalize mb-1">{tier}</p>
                <p className="text-2xl font-bold text-gray-900">₹{revenue.toLocaleString()}</p>
                <p className="text-xs text-gray-500">/month</p>
              </div>
            ))}
          </div>
        </div>

        {/* MRR Growth Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">MRR Growth</h2>
          <div className="space-y-2">
            {metrics.mrrGrowth.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.month}</span>
                <div className="flex items-center gap-4">
                  <div className="w-48 bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-blue-600 h-4 rounded-full"
                      style={{ width: `${(item.mrr / metrics.mrr) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-24 text-right">
                    ₹{Math.round(item.mrr).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

