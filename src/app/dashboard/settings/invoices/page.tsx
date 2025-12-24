'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/stores/auth'

// Invoice template options
const invoiceTemplates = [
  { value: 'standard', label: 'Standard Invoice', description: 'Classic invoice layout with all details' },
  { value: 'minimal', label: 'Minimal Invoice', description: 'Clean and simple invoice design' },
  { value: 'detailed', label: 'Detailed Invoice', description: 'Comprehensive invoice with itemized breakdown' },
  { value: 'professional', label: 'Professional Invoice', description: 'Business-focused design with branding' },
  { value: 'gst-compliant', label: 'GST Compliant Invoice', description: 'Full GST breakdown with HSN/SAC codes' },
]

export default function InvoiceSettingsPage() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    template: 'standard',
    defaultReverseCharge: false,
    showReverseCharge: true, // Show Reverse Charge option in invoice form
    defaultPaymentTerms: '',
    defaultNotes: '',
    invoicePrefix: 'INV',
    autoGenerateNumber: true,
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch invoice settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['invoice-settings'],
    queryFn: async () => {
      const { token } = useAuthStore.getState()
      const response = await fetch('/api/settings/invoices', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })
      if (!response.ok) throw new Error('Failed to fetch invoice settings')
      return response.json()
    },
  })

  // Update invoice settings
  const updateSettings = useMutation({
    mutationFn: async (data: any) => {
      const { token } = useAuthStore.getState()
      const response = await fetch('/api/settings/invoices', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        let error: any
        try {
          const errorText = await response.text()
          try {
            error = JSON.parse(errorText)
          } catch {
            error = { error: errorText || `HTTP ${response.status}: ${response.statusText}` }
          }
        } catch (parseError) {
          error = { error: `Failed to update invoice settings (${response.status})` }
        }
        
        console.error('Update invoice settings API error:', {
          status: response.status,
          statusText: response.statusText,
          error: JSON.stringify(error, null, 2),
        })
        
        const errorMessage = error.message || error.error || 'Failed to update invoice settings'
        throw new Error(errorMessage)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-settings'] })
      setSuccess('Invoice settings updated successfully!')
      setError('')
      setTimeout(() => setSuccess(''), 3000)
    },
    onError: (err: Error) => {
      setError(err.message)
      setSuccess('')
    },
  })

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setFormData({
        template: settings.template || 'standard',
        defaultReverseCharge: settings.defaultReverseCharge || false,
        showReverseCharge: settings.showReverseCharge !== false, // Default to true if not set
        defaultPaymentTerms: settings.defaultPaymentTerms || '',
        defaultNotes: settings.defaultNotes || '',
        invoicePrefix: settings.invoicePrefix || 'INV',
        autoGenerateNumber: settings.autoGenerateNumber !== false,
      })
    }
  }, [settings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    updateSettings.mutate(formData)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice Settings</h1>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Invoice Settings</h1>
        <p className="mt-2 text-gray-600">
          Configure invoice templates and default settings for your business
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Invoice Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Template</CardTitle>
              <CardDescription>
                Select the default invoice template for your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invoiceTemplates.map((template) => (
                  <label
                    key={template.value}
                    className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.template === template.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={template.value}
                      checked={formData.template === template.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-gray-900">{template.label}</div>
                      <div className="text-sm text-gray-500">{template.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Default Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Default Invoice Settings</CardTitle>
              <CardDescription>
                Set default values for new invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showReverseCharge"
                    checked={formData.showReverseCharge}
                    onChange={(e) => setFormData(prev => ({ ...prev, showReverseCharge: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="showReverseCharge" className="text-sm font-medium cursor-pointer">
                    Show Reverse Charge Option in Invoice Form
                  </label>
                </div>
                <p className="text-xs text-gray-500 ml-6">
                  When enabled, the Reverse Charge checkbox will be visible in the invoice creation form
                </p>
                
                {formData.showReverseCharge && (
                  <div className="ml-6 space-y-2 border-t pt-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="defaultReverseCharge"
                        checked={formData.defaultReverseCharge}
                        onChange={(e) => setFormData(prev => ({ ...prev, defaultReverseCharge: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="defaultReverseCharge" className="text-sm font-medium cursor-pointer">
                        Default Reverse Charge Applicable (GST payable by recipient)
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">
                      When enabled, new invoices will have Reverse Charge checked by default
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="defaultPaymentTerms" className="text-sm font-medium">
                  Default Payment Terms
                </label>
                <Input
                  id="defaultPaymentTerms"
                  value={formData.defaultPaymentTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultPaymentTerms: e.target.value }))}
                  placeholder="e.g., Net 30, Due on receipt, etc."
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="defaultNotes" className="text-sm font-medium">
                  Default Notes
                </label>
                <textarea
                  id="defaultNotes"
                  value={formData.defaultNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultNotes: e.target.value }))}
                  rows={3}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  placeholder="Default notes to appear on invoices"
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoice Numbering */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Numbering</CardTitle>
              <CardDescription>
                Configure how invoice numbers are generated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoGenerateNumber"
                  checked={formData.autoGenerateNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoGenerateNumber: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoGenerateNumber" className="text-sm font-medium cursor-pointer">
                  Auto-generate invoice numbers
                </label>
              </div>

              <div className="space-y-2">
                <label htmlFor="invoicePrefix" className="text-sm font-medium">
                  Invoice Number Prefix
                </label>
                <Input
                  id="invoicePrefix"
                  value={formData.invoicePrefix}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoicePrefix: e.target.value }))}
                  placeholder="INV"
                  maxLength={10}
                />
                <p className="text-xs text-gray-500">
                  Invoice numbers will be formatted as: {formData.invoicePrefix}-{'{BUSINESS'}-{'{NUMBER}'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Error/Success Messages */}
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

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}



