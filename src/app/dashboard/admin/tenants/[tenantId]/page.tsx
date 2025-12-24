'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface TenantDetails {
  tenant: {
    id: string
    name: string
    email: string
    subdomain: string
    status: string
    subscriptionTier: string
    licensedModules: string[]
    createdAt: string
  }
  subscription: {
    id: string
    modules: string[]
    tier: string
    monthlyPrice: number
    billingCycleStart: string
    billingCycleEnd: string
    status: string
  } | null
  users: Array<{
    id: string
    name: string
    email: string
    role: string
    createdAt: string
  }>
  usage: {
    contacts: number
    invoices: number
    employees: number
    orders: number
    users: number
  }
  paymentHistory: Array<{
    id: string
    orderNumber: string
    amount: number
    date: string
    paidAt?: string
  }>
}

export default function TenantDetailsPage() {
  const { token } = useAuthStore()
  const params = useParams()
  const router = useRouter()
  const tenantId = params.tenantId as string
  const [details, setDetails] = useState<TenantDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    licensedModules: [] as string[],
    subscriptionTier: 'free' as string,
    status: 'active' as string,
  })

  useEffect(() => {
    if (!token || !tenantId) return

    fetch(`/api/admin/tenants/${tenantId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setDetails(data)
        setFormData({
          licensedModules: data.tenant.licensedModules || [],
          subscriptionTier: data.tenant.subscriptionTier || 'free',
          status: data.tenant.status || 'active',
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [token, tenantId])

  const handleSave = async () => {
    if (!token) return

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setEditing(false)
        // Reload data
        window.location.reload()
      } else {
        alert('Failed to update tenant')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update tenant')
    }
  }

  const moduleIcons: Record<string, string> = {
    crm: '👥',
    invoicing: '📄',
    accounting: '💰',
    hr: '👔',
    whatsapp: '💬',
    analytics: '📊',
  }

  const allModules = ['crm', 'invoicing', 'accounting', 'hr', 'whatsapp', 'analytics']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Tenant not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/dashboard/admin/tenants"
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← Back to Tenants
          </Link>
          <div className="flex justify-between items-center mt-4">
            <h1 className="text-3xl font-bold text-gray-900">{details.tenant.name}</h1>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Edit Tenant
              </button>
            )}
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-semibold text-gray-900">{details.tenant.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Subdomain</p>
              <p className="font-semibold text-gray-900">{details.tenant.subdomain || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="font-semibold text-gray-900">
                {new Date(details.tenant.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              {editing ? (
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              ) : (
                <span className={`px-2 py-1 rounded text-sm ${
                  details.tenant.status === 'active' ? 'bg-green-100 text-green-700' :
                  details.tenant.status === 'suspended' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {details.tenant.status}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Subscription</h2>
          {details.subscription ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Tier</p>
                  {editing ? (
                    <select
                      value={formData.subscriptionTier}
                      onChange={(e) => setFormData({ ...formData, subscriptionTier: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg w-full"
                    >
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  ) : (
                    <p className="font-semibold text-gray-900 capitalize">{details.subscription.tier}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Monthly Price</p>
                  <p className="font-semibold text-gray-900">
                    ₹{details.subscription.monthlyPrice.toLocaleString()}/month
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Billing Cycle</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(details.subscription.billingCycleStart).toLocaleDateString()} - {new Date(details.subscription.billingCycleEnd).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold text-gray-900 capitalize">{details.subscription.status}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Licensed Modules</p>
                {editing ? (
                  <div className="space-y-2">
                    {allModules.map((moduleId) => (
                      <label key={moduleId} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.licensedModules.includes(moduleId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                licensedModules: [...formData.licensedModules, moduleId],
                              })
                            } else {
                              setFormData({
                                ...formData,
                                licensedModules: formData.licensedModules.filter(m => m !== moduleId),
                              })
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">
                          {moduleIcons[moduleId]} {moduleId.toUpperCase()}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {details.tenant.licensedModules.map((moduleId) => (
                      <span
                        key={moduleId}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                      >
                        <span>{moduleIcons[moduleId] || '📦'}</span>
                        <span className="uppercase">{moduleId}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {editing && (
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleSave}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false)
                      setFormData({
                        licensedModules: details.tenant.licensedModules || [],
                        subscriptionTier: details.tenant.subscriptionTier || 'free',
                        status: details.tenant.status || 'active',
                      })
                    }}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600">No active subscription</p>
          )}
        </div>

        {/* Usage Dashboard */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Usage</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{details.usage.contacts}</p>
              <p className="text-sm text-gray-600">Contacts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{details.usage.invoices}</p>
              <p className="text-sm text-gray-600">Invoices</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{details.usage.employees}</p>
              <p className="text-sm text-gray-600">Employees</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{details.usage.orders}</p>
              <p className="text-sm text-gray-600">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{details.usage.users}</p>
              <p className="text-sm text-gray-600">Users</p>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Payment History</h2>
          {details.paymentHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-gray-700">Order #</th>
                    <th className="text-left py-2 text-gray-700">Date</th>
                    <th className="text-left py-2 text-gray-700">Amount</th>
                    <th className="text-left py-2 text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {details.paymentHistory.map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="py-3 text-gray-900 font-medium">{order.orderNumber}</td>
                      <td className="py-3 text-gray-600">
                        {new Date(order.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-gray-900">
                        ₹{order.amount.toLocaleString()}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                          Paid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No payment history</p>
          )}
        </div>
      </div>
    </div>
  )
}

