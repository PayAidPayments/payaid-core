'use client'

import { useState, useEffect } from 'react'
import { usePayAidAuth } from '@/lib/hooks/use-payaid-auth'
import { useAuthStore } from '@/lib/stores/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Module definitions (V2 - 8 Module Structure)
const MODULES = [
  {
    id: 'crm',
    name: 'CRM',
    description: 'Customer relationship management - Contacts, Deals, Pipeline, Tasks',
    icon: '👥',
    price: { starter: 1999, professional: 2999 },
  },
  {
    id: 'sales',
    name: 'Sales',
    description: 'Sales pages, checkout, and order management',
    icon: '🛒',
    price: { starter: 1999, professional: 2999 },
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Campaigns, social media, email templates, events, WhatsApp',
    icon: '📢',
    price: { starter: 1999, professional: 2999 },
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Invoices, accounting, GST reports, and financial analytics',
    icon: '💰',
    price: { starter: 2499, professional: 3999 },
  },
  {
    id: 'hr',
    name: 'HR & Payroll',
    description: 'Employee management, payroll, attendance, leave',
    icon: '👔',
    price: { starter: 2499, professional: 3999 },
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Email accounts, webmail, and team chat',
    icon: '💬',
    price: { starter: 1499, professional: 2499 },
  },
  {
    id: 'ai-studio',
    name: 'AI Studio',
    description: 'AI-powered website builder, logo generator, AI chat, and calling bot',
    icon: '✨',
    price: { starter: 1999, professional: 2999 },
  },
  {
    id: 'analytics',
    name: 'Analytics & Reporting',
    description: 'Business intelligence, custom reports, and dashboards',
    icon: '📈',
    price: { starter: 1999, professional: 2999 },
  },
]

export default function AdminModulesPage() {
  const { tenant, licensedModules, subscriptionTier, hasModule } = usePayAidAuth()
  const { token } = useAuthStore()
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const handleToggleModule = async (moduleId: string) => {
    if (!tenant?.id || !token) return

    setIsUpdating(moduleId)
    try {
      const isCurrentlyLicensed = hasModule(moduleId)
      const newModules = isCurrentlyLicensed
        ? licensedModules.filter((id) => id !== moduleId)
        : [...licensedModules, moduleId]

      const response = await fetch(`/api/admin/tenants/${tenant.id}/modules`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          licensedModules: newModules,
        }),
      })

      if (!response.ok) {
        let errorData: any = {}
        try {
          const text = await response.text()
          if (text) {
            errorData = JSON.parse(text)
          }
        } catch (parseError) {
          // If response is not valid JSON, use status text
          errorData = { error: response.statusText || 'Unknown error' }
        }
        
        // Use detailed error message if available, otherwise use generic one
        const errorMessage = errorData.message || errorData.error || `Failed to update module license (${response.status})`
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        })
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('Module updated successfully:', result)

      // Show success message
      alert(
        `Module ${isCurrentlyLicensed ? 'deactivated' : 'activated'} successfully! ` +
        `Please log out and log back in to refresh your access token.`
      )

      // Refresh page to update auth state (though token won't update until logout/login)
      window.location.reload()
    } catch (error) {
      console.error('Error updating module:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update module license. Please try again.'
      alert(`Error: ${errorMessage}`)
    } finally {
      setIsUpdating(null)
    }
  }

  // Only allow admin/owner to access
  const { user } = useAuthStore()
  if (user?.role !== 'owner' && user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need admin or owner permissions to manage modules.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Module Management</h1>
        <p className="mt-2 text-gray-600">
          Manage module licenses for {tenant?.name}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Current Plan: <span className="font-medium capitalize">{subscriptionTier}</span>
        </p>
      </div>

      {/* Current Licenses */}
      <Card>
        <CardHeader>
          <CardTitle>Licensed Modules</CardTitle>
          <CardDescription>
            {licensedModules.length} of {MODULES.length} modules licensed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {licensedModules.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No modules licensed</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {licensedModules.map((moduleId) => {
                const module = MODULES.find((m) => m.id === moduleId)
                return module ? (
                  <span
                    key={moduleId}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    <span>{module.icon}</span>
                    {module.name}
                  </span>
                ) : null
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((module) => {
          const isLicensed = hasModule(module.id)
          const isUpdatingThis = isUpdating === module.id

          return (
            <Card key={module.id} className={isLicensed ? 'border-green-500' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{module.icon}</span>
                    <div>
                      <CardTitle className="text-lg">{module.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {module.description}
                      </CardDescription>
                    </div>
                  </div>
                  {isLicensed && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Licensed
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <div>Starter: ₹{module.price.starter}/mo</div>
                    <div>Professional: ₹{module.price.professional}/mo</div>
                  </div>
                  <Button
                    onClick={() => handleToggleModule(module.id)}
                    disabled={isUpdatingThis}
                    variant={isLicensed ? 'outline' : 'default'}
                    className="w-full"
                  >
                    {isUpdatingThis
                      ? 'Updating...'
                      : isLicensed
                      ? 'Remove License'
                      : 'Activate License'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Note */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This is an admin panel for testing. In production, module
            licenses will be managed through the App Store and payment system (Phase 3).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
