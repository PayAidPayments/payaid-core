import { ModuleGate } from '@/components/modules/ModuleGate'
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/lib/stores/auth'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

const settingsMenu = [
  {
    name: 'Profile',
    href: '/dashboard/settings/profile',
    description: 'Manage your personal information and password',
    icon: '👤',
  },
  {
    name: 'Business Settings',
    href: '/dashboard/settings/tenant',
    description: 'Configure business information for invoices',
    icon: '🏢',
  },
  {
    name: 'KYC Verification',
    href: '/dashboard/settings/kyc',
    description: 'Upload KYC documents as per Indian regulations',
    icon: '📋',
  },
  {
    name: 'AI Integrations',
    href: '/dashboard/settings/ai',
    description: 'Connect Google AI Studio and other AI services',
    icon: '🤖',
  },
  {
    name: 'Sales Representatives',
    href: '/dashboard/settings/sales-reps',
    description: 'Manage your sales team and lead assignments',
    icon: '👔',
  },
  {
    name: 'Payment Gateway',
    href: '/dashboard/settings/payment-gateway',
    description: 'Configure PayAid Payments API credentials',
    icon: '💳',
  },
  {
    name: 'Invoice Settings',
    href: '/dashboard/settings/invoices',
    description: 'Configure invoice templates and default settings',
    icon: '🧾',
  },
]

function OrgIdCard() {
  const { tenant } = useAuthStore()
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    if (tenant?.id) {
      await navigator.clipboard.writeText(tenant.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!tenant?.id) return null

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🏢</span>
          Organization ID
        </CardTitle>
        <CardDescription>
          Share this ID with our support team for faster assistance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <code className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-mono text-gray-800">
            {tenant.id}
          </code>
          <Button
            onClick={copyToClipboard}
            variant="outline"
            size="sm"
            className="shrink-0"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </Button>
        </div>
        <p className="mt-3 text-xs text-gray-600">
          This unique identifier helps our support team quickly locate your organization&apos;s account.
        </p>
      </CardContent>
    </Card>
  )
}

function SettingsPage() {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your account and business settings
        </p>
      </div>

      {/* Organization ID Card */}
      <OrgIdCard />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsMenu.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <Card
                className={cn(
                  'transition-all hover:shadow-md cursor-pointer',
                  isActive && 'ring-2 ring-blue-500'
                )}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{item.icon}</span>
                    <div>
                      <CardTitle>{item.name}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Link
              href="/dashboard/settings/profile"
              className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Profile Settings</div>
              <div className="text-sm text-gray-500">
                Update your name, email, and password
              </div>
            </Link>
            <Link
              href="/dashboard/settings/tenant"
              className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Business Settings</div>
              <div className="text-sm text-gray-500">
                Configure GSTIN, address, and business details
              </div>
            </Link>
            <Link
              href="/dashboard/settings/kyc"
              className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">KYC Verification</div>
              <div className="text-sm text-gray-500">
                Upload PAN, Aadhaar, Bank Statement, and other KYC documents
              </div>
            </Link>
            <Link
              href="/dashboard/settings/ai"
              className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">AI Integrations</div>
              <div className="text-sm text-gray-500">
                Connect Google AI Studio and other AI services for image generation
              </div>
            </Link>
            <Link
              href="/dashboard/settings/sales-reps"
              className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Sales Representatives</div>
              <div className="text-sm text-gray-500">
                Manage your sales team, set specializations, and track performance
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


export default function Page() {
  return (
    <ModuleGate module="core">
      <SettingsPage />
    </ModuleGate>
  )
}
