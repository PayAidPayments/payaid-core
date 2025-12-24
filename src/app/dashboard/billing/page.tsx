import { ModuleGate } from '@/components/modules/ModuleGate'
'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth'
import Link from 'next/link'

interface Subscription {
  id: string
  modules: string[]
  tier: string
  monthlyPrice: number
  billingCycleStart: string
  billingCycleEnd: string
  status: string
}

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
  paidAt?: string
  modules: string[]
}

function BillingPage() {
  const { token } = useAuthStore()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return

    // Fetch licenses/subscription
    fetch('/api/user/licenses', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.subscription) {
          setSubscription({
            id: data.subscription.id,
            modules: data.subscription.modules,
            tier: data.subscription.tier,
            monthlyPrice: data.subscription.monthlyPrice,
            billingCycleStart: data.subscription.billingCycleStart,
            billingCycleEnd: data.subscription.billingCycleEnd,
            status: data.subscription.status,
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // TODO: Fetch order history
    // fetch('/api/billing/orders')
  }, [token])

  const moduleIcons: Record<string, string> = {
    crm: '👥',
    invoicing: '📄',
    accounting: '💰',
    hr: '👔',
    whatsapp: '💬',
    analytics: '📊',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Subscription</h1>

        {/* Current Plan */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Current Plan</h2>
          {subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 capitalize">{subscription.tier}</p>
                  <p className="text-gray-600">
                    ₹{subscription.monthlyPrice.toLocaleString()}/month
                  </p>
                </div>
                <Link
                  href="/app-store"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Upgrade Plan
                </Link>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Licensed Modules:</p>
                <div className="flex flex-wrap gap-2">
                  {subscription.modules.map((moduleId) => (
                    <span
                      key={moduleId}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                    >
                      <span>{moduleIcons[moduleId] || '📦'}</span>
                      <span className="uppercase">{moduleId}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-600 pt-4 border-t">
                <span>
                  Billing Cycle: {new Date(subscription.billingCycleStart).toLocaleDateString()} - {new Date(subscription.billingCycleEnd).toLocaleDateString()}
                </span>
                <span className="capitalize">Status: {subscription.status}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No active subscription</p>
              <Link
                href="/app-store"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition inline-block"
              >
                Browse Modules
              </Link>
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Payment History</h2>
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-gray-700">Order #</th>
                    <th className="text-left py-2 text-gray-700">Date</th>
                    <th className="text-left py-2 text-gray-700">Amount</th>
                    <th className="text-left py-2 text-gray-700">Status</th>
                    <th className="text-left py-2 text-gray-700">Modules</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="py-3 text-gray-900 font-medium">{order.orderNumber}</td>
                      <td className="py-3 text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-gray-900">
                        ₹{order.total.toLocaleString()}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-sm ${
                          order.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {order.modules.slice(0, 3).map((moduleId) => (
                            <span key={moduleId} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {moduleId.toUpperCase()}
                            </span>
                          ))}
                          {order.modules.length > 3 && (
                            <span className="text-xs text-gray-500">+{order.modules.length - 3}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No payment history yet</p>
          )}
        </div>
      </div>
    </div>
  )
}



export default function Page() {
  return (
    <ModuleGate module="core">
      <BillingPage />
    </ModuleGate>
  )
}
