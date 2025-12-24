'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAuthHeaders } from '@/lib/hooks/use-api'

export default function PaymentGatewaySettingsPage() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    payaidApiKey: '',
    payaidSalt: '',
    payaidBaseUrl: '',
    payaidEncryptionKey: '',
    payaidDecryptionKey: '',
    payaidWebhookSecret: '',
    isActive: false,
    testMode: false,
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showSecrets, setShowSecrets] = useState(false)

  // Fetch payment gateway settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['payment-gateway-settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings/payment-gateway', {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Failed to fetch payment gateway settings')
      return response.json()
    },
  })

  // Update payment gateway settings
  const updateSettings = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/settings/payment-gateway', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update settings')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-gateway-settings'] })
      setSuccess('Payment gateway settings updated successfully!')
      setError('')
      setTimeout(() => setSuccess(''), 5000)
      setShowSecrets(false) // Hide secrets after save
    },
    onError: (err: Error) => {
      setError(err.message)
      setSuccess('')
    },
  })

  // Load settings into form
  useEffect(() => {
    if (settings) {
      // Settings come with masked values, so we only populate if user wants to edit
      setFormData(prev => ({
        ...prev,
        isActive: settings.isActive || false,
        testMode: settings.testMode || false,
        payaidBaseUrl: settings.payaidBaseUrl || '',
      }))
    }
  }, [settings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate required fields
    if (!formData.payaidApiKey || !formData.payaidSalt || !formData.payaidBaseUrl) {
      setError('API Key, SALT, and Base URL are required')
      return
    }

    try {
      await updateSettings.mutateAsync(formData)
    } catch (err) {
      // Error handled by mutation
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payment Gateway Settings</h1>
        <p className="mt-2 text-gray-600">
          Configure your PayAid Payments gateway credentials. Each tenant has separate credentials.
        </p>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>PayAid Payments Configuration</CardTitle>
          <CardDescription>
            Enter your PayAid Payments API credentials. These credentials are encrypted and stored
            securely per tenant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Status */}
            {settings?.isConfigured && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Payment Gateway Status
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {settings.isActive ? (
                        <span className="text-green-600">● Active</span>
                      ) : (
                        <span className="text-gray-600">● Inactive</span>
                      )}
                      {settings.testMode && (
                        <span className="ml-2 text-orange-600">● Test Mode</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Required Fields */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Required Fields</h3>

              <div className="space-y-2">
                <label htmlFor="payaidApiKey" className="text-sm font-medium">
                  API Key *
                  <span className="text-gray-500 text-xs ml-2">
                    (36-digit merchant key from PayAid Payments)
                  </span>
                </label>
                <Input
                  id="payaidApiKey"
                  name="payaidApiKey"
                  type={showSecrets ? 'text' : 'password'}
                  value={formData.payaidApiKey}
                  onChange={handleChange}
                  placeholder="f14e50fd-82f0-4ce0-bd4e-de924908d4ff"
                  required
                  disabled={updateSettings.isPending}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="payaidSalt" className="text-sm font-medium">
                  SALT (Secret Key) *
                  <span className="text-gray-500 text-xs ml-2">
                    (Used for hash calculation - KEEP SECRET!)
                  </span>
                </label>
                <Input
                  id="payaidSalt"
                  name="payaidSalt"
                  type={showSecrets ? 'text' : 'password'}
                  value={formData.payaidSalt}
                  onChange={handleChange}
                  placeholder="Enter your SALT key"
                  required
                  disabled={updateSettings.isPending}
                />
                <p className="text-xs text-gray-500">
                  This is encrypted before storage. Never share this key.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="payaidBaseUrl" className="text-sm font-medium">
                  Base URL *
                  <span className="text-gray-500 text-xs ml-2">
                    (Payment gateway API URL)
                  </span>
                </label>
                <Input
                  id="payaidBaseUrl"
                  name="payaidBaseUrl"
                  type="url"
                  value={formData.payaidBaseUrl}
                  onChange={handleChange}
                  placeholder="https://api.payaidpayments.com"
                  required
                  disabled={updateSettings.isPending}
                />
              </div>
            </div>

            {/* Optional Fields */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-700">Optional Fields</h3>

              <div className="space-y-2">
                <label htmlFor="payaidEncryptionKey" className="text-sm font-medium">
                  Encryption Key
                  <span className="text-gray-500 text-xs ml-2">
                    (For encrypted payment requests)
                  </span>
                </label>
                <Input
                  id="payaidEncryptionKey"
                  name="payaidEncryptionKey"
                  type={showSecrets ? 'text' : 'password'}
                  value={formData.payaidEncryptionKey}
                  onChange={handleChange}
                  placeholder="Enter encryption key (optional)"
                  disabled={updateSettings.isPending}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="payaidDecryptionKey" className="text-sm font-medium">
                  Decryption Key
                  <span className="text-gray-500 text-xs ml-2">
                    (For decrypting payment responses)
                  </span>
                </label>
                <Input
                  id="payaidDecryptionKey"
                  name="payaidDecryptionKey"
                  type={showSecrets ? 'text' : 'password'}
                  value={formData.payaidDecryptionKey}
                  onChange={handleChange}
                  placeholder="Enter decryption key (optional)"
                  disabled={updateSettings.isPending}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="payaidWebhookSecret" className="text-sm font-medium">
                  Webhook Secret
                  <span className="text-gray-500 text-xs ml-2">
                    (For webhook signature verification)
                  </span>
                </label>
                <Input
                  id="payaidWebhookSecret"
                  name="payaidWebhookSecret"
                  type={showSecrets ? 'text' : 'password'}
                  value={formData.payaidWebhookSecret}
                  onChange={handleChange}
                  placeholder="Enter webhook secret (optional)"
                  disabled={updateSettings.isPending}
                />
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  disabled={updateSettings.isPending}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm font-medium">
                  Enable Payment Gateway
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="testMode"
                  name="testMode"
                  checked={formData.testMode}
                  onChange={handleChange}
                  disabled={updateSettings.isPending}
                  className="rounded border-gray-300"
                />
                <label htmlFor="testMode" className="text-sm font-medium">
                  Test Mode
                  <span className="text-gray-500 text-xs ml-2">
                    (Use test environment for payments)
                  </span>
                </label>
              </div>
            </div>

            {/* Show/Hide Secrets Toggle */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="showSecrets"
                checked={showSecrets}
                onChange={e => setShowSecrets(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="showSecrets" className="text-sm text-gray-600">
                Show secret values
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-900">Security Notice</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-yellow-800 space-y-2">
            <li>
              • All sensitive credentials (SALT, encryption keys, webhook secrets) are encrypted
              before storage
            </li>
            <li>
              • Each tenant has separate payment gateway credentials - credentials are never mixed
              between tenants
            </li>
            <li>
              • Never share your SALT or encryption keys with anyone
            </li>
            <li>
              • Keep your API credentials secure and rotate them periodically
            </li>
            <li>
              • Use Test Mode during development and testing
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
