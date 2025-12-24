'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth'
import Link from 'next/link'

interface Tenant {
  id: string
  name: string
  email: string
  subdomain: string
  status: string
  subscriptionTier: string
  licensedModules: string[]
  monthlyRevenue: number
  userCount: number
  createdAt: string
}

export default function TenantsPage() {
  const { token } = useAuthStore()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')

  useEffect(() => {
    if (!token) return

    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (tierFilter !== 'all') params.set('tier', tierFilter)

    fetch(`/api/admin/tenants?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setTenants(data.tenants || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [token, search, statusFilter, tierFilter])

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
          <Link
            href="/dashboard/admin/revenue"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            View Revenue
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Tiers</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modules</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{tenant.name}</p>
                      <p className="text-sm text-gray-500">{tenant.email}</p>
                      <p className="text-xs text-gray-400">{tenant.subdomain}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium capitalize">
                      {tenant.subscriptionTier}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {tenant.licensedModules.slice(0, 3).map((moduleId) => (
                        <span key={moduleId} className="text-xs" title={moduleId}>
                          {moduleIcons[moduleId] || '📦'}
                        </span>
                      ))}
                      {tenant.licensedModules.length > 3 && (
                        <span className="text-xs text-gray-500">+{tenant.licensedModules.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">₹{tenant.monthlyRevenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">/month</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-sm ${
                      tenant.status === 'active' ? 'bg-green-100 text-green-700' :
                      tenant.status === 'suspended' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/admin/tenants/${tenant.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      View Details →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tenants.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No tenants found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

