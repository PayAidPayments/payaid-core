'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/auth'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

function HealthScoreWidget() {
  const { token } = useAuthStore()
  const { data: healthScore } = useQuery({
    queryKey: ['health-score'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/health-score', {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Failed to fetch health score')
      return response.json()
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const score = healthScore?.healthScore || 0
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Needs Attention'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Business Health</CardTitle>
        <span className="text-2xl">💚</span>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}/100</div>
        <CardDescription>{getScoreLabel(score)}</CardDescription>
        {healthScore?.factors && (
          <div className="mt-3 space-y-1">
            {healthScore.factors.slice(0, 3).map((factor: any, idx: number) => (
              <div key={idx} className="text-xs text-gray-600">
                • {factor.name}: {factor.score}/100
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getAuthHeaders() {
  const { token } = useAuthStore.getState()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

export default function DashboardPage() {
  const { user, tenant, token } = useAuthStore()
  const [stats, setStats] = useState({
    contacts: 0,
    deals: 0,
    orders: 0,
    invoices: 0,
    tasks: 0,
  })

  // Fetch dashboard stats
  const { data: dashboardStats, isLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats', {
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        // Check if it's a license error
        if (response.status === 403 && errorData.code === 'MODULE_NOT_LICENSED') {
          const error = new Error(errorData.error || 'Analytics module required')
          ;(error as any).isLicenseError = true
          ;(error as any).moduleId = errorData.moduleId
          throw error
        }
        throw new Error(errorData.error || 'Failed to fetch dashboard stats')
      }
      return response.json()
    },
    enabled: !!token,
    retry: false, // Don't retry license errors
    staleTime: 2 * 60 * 1000, // 2 minutes - dashboard stats don't change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  })

  useEffect(() => {
    if (dashboardStats) {
      setStats({
        contacts: dashboardStats.counts?.contacts || 0,
        deals: dashboardStats.counts?.deals || 0,
        orders: dashboardStats.counts?.orders || 0,
        invoices: dashboardStats.counts?.invoices || 0,
        tasks: dashboardStats.counts?.tasks || 0,
      })
    }
  }, [dashboardStats])

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name || user?.email}!
        </h1>
        <p className="mt-2 text-gray-600">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacts</CardTitle>
            <span className="text-2xl">👥</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contacts}</div>
            <CardDescription>Total contacts</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deals</CardTitle>
            <span className="text-2xl">💼</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deals}</div>
            <CardDescription>Active deals</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <span className="text-2xl">🛒</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orders}</div>
            <CardDescription>Total orders</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            <span className="text-2xl">🧾</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.invoices}</div>
            <CardDescription>Total invoices</CardDescription>
          </CardContent>
        </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks</CardTitle>
              <span className="text-2xl">✅</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tasks}</div>
              <CardDescription>Total tasks</CardDescription>
            </CardContent>
          </Card>

          {/* Health Score Widget */}
          <HealthScoreWidget />
        </div>

      {/* Error Message */}
      {statsError && (
        <div className="p-4 text-sm bg-yellow-50 border border-yellow-200 rounded-md">
          {(statsError as any)?.isLicenseError ? (
            <div>
              <p className="font-semibold text-yellow-800 mb-2">
                🔒 Analytics Module Required
              </p>
              <p className="text-yellow-700 mb-3">
                Dashboard statistics require the Analytics module. Please contact your administrator to activate this module.
              </p>
              <Link href="/dashboard/admin/modules">
                <Button variant="outline" size="sm" className="text-yellow-800 border-yellow-300 hover:bg-yellow-100">
                  Manage Modules
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-red-600">
              Failed to load dashboard stats. Please refresh the page.
            </div>
          )}
        </div>
      )}

      {/* Revenue & Pipeline */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue (30 Days)</CardTitle>
              <span className="text-2xl">💰</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₹{dashboardStats.revenue?.last30Days?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
              <CardDescription>Last 30 days revenue</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
              <span className="text-2xl">📈</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ₹{dashboardStats.pipeline?.value?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
              <CardDescription>{dashboardStats.pipeline?.activeDeals || 0} active deals</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alerts</CardTitle>
              <span className="text-2xl">⚠️</span>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardStats.alerts?.overdueInvoices > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Overdue Invoices</span>
                    <span className="text-sm font-semibold text-red-600">
                      {dashboardStats.alerts.overdueInvoices}
                    </span>
                  </div>
                )}
                {dashboardStats.alerts?.pendingTasks > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pending Tasks</span>
                    <span className="text-sm font-semibold text-yellow-600">
                      {dashboardStats.alerts.pendingTasks}
                    </span>
                  </div>
                )}
                {(!dashboardStats.alerts?.overdueInvoices && !dashboardStats.alerts?.pendingTasks) && (
                  <div className="text-sm text-green-600">All good! 🎉</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/dashboard/contacts/new"
              className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Add New Contact</div>
              <div className="text-sm text-gray-500">Create a new customer or lead</div>
            </Link>
            <Link
              href="/dashboard/orders/new"
              className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Create Order</div>
              <div className="text-sm text-gray-500">Create a new customer order</div>
            </Link>
            <Link
              href="/dashboard/invoices/new"
              className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Create Invoice</div>
              <div className="text-sm text-gray-500">Generate a new invoice</div>
            </Link>
            <Link
              href="/dashboard/products/new"
              className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Add Product</div>
              <div className="text-sm text-gray-500">Add a new product to catalog</div>
            </Link>
            <Link
              href="/dashboard/tasks/new"
              className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Create Task</div>
              <div className="text-sm text-gray-500">Add a new task</div>
            </Link>
          </CardContent>
        </Card>

        {dashboardStats?.recentActivity && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates across your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardStats.recentActivity.orders?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">Recent Orders</div>
                  {dashboardStats.recentActivity.orders.slice(0, 3).map((order: any) => (
                    <Link
                      key={order.id}
                      href={`/dashboard/orders/${order.id}`}
                      className="block p-2 border border-gray-100 rounded-md hover:bg-gray-50 transition-colors mb-2"
                    >
                      <div className="text-sm font-medium">{order.orderNumber}</div>
                      <div className="text-xs text-gray-500">
                        ₹{order.total?.toLocaleString('en-IN')} • {format(new Date(order.createdAt), 'MMM dd')}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {dashboardStats.recentActivity.deals?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">Recent Deals</div>
                  {dashboardStats.recentActivity.deals.slice(0, 3).map((deal: any) => (
                    <Link
                      key={deal.id}
                      href={`/dashboard/deals/${deal.id}`}
                      className="block p-2 border border-gray-100 rounded-md hover:bg-gray-50 transition-colors mb-2"
                    >
                      <div className="text-sm font-medium">{deal.name}</div>
                      <div className="text-xs text-gray-500">
                        ₹{deal.value?.toLocaleString('en-IN')} • {deal.stage}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Account Info</CardTitle>
            <CardDescription>Your subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">Plan</div>
              <div className="text-lg font-semibold capitalize">{tenant?.plan || 'Free'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Business Name</div>
              <div className="text-lg font-semibold">{tenant?.name}</div>
            </div>
            {tenant?.subdomain && (
              <div>
                <div className="text-sm text-gray-500">Subdomain</div>
                <div className="text-lg font-semibold">{tenant.subdomain}.payaid.com</div>
              </div>
            )}
            {tenant?.id && (
              <div className="pt-2 border-t border-gray-200">
                <div className="text-sm text-gray-500 mb-1">Organization ID</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-800">
                    {tenant.id}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(tenant.id)
                    }}
                    className="shrink-0 text-xs"
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Share with support for faster assistance
                </p>
              </div>
            )}
            <Link href="/dashboard/settings">
              <Button variant="outline" className="w-full mt-4">
                Manage Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
