'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getAllIndustries } from '@/lib/industries/features'

const INDUSTRIES = [
  {
    id: 'restaurant',
    name: 'Restaurant & Food Service',
    icon: '🍽️',
    description: 'QR menu, kitchen display, order management, recipe costing',
    color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
  },
  {
    id: 'retail',
    name: 'Retail & E-commerce',
    icon: '🛒',
    description: 'POS system, inventory management, barcode scanning, loyalty programs',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing & Production',
    icon: '🏭',
    description: 'Production planning, BOM management, vendor network, quality control',
    color: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
  },
  {
    id: 'real_estate',
    name: 'Real Estate & Property',
    icon: '🏠',
    description: 'Property showcase, advance collection, project management, document vault',
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Wellness',
    icon: '🏥',
    description: 'Patient management, appointments, prescriptions, lab management',
    color: 'bg-red-50 border-red-200 hover:bg-red-100',
  },
]

export default function IndustrySelectionPage() {
  const router = useRouter()
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null)

  const setIndustryMutation = useMutation({
    mutationFn: async (industryId: string) => {
      const response = await apiRequest(`/api/industries/${industryId}`, {
        method: 'POST',
        body: JSON.stringify({
          industrySubType: industryId,
        }),
      })
      if (!response.ok) throw new Error('Failed to set industry')
      return response.json()
    },
    onSuccess: () => {
      // Redirect to dashboard
      router.push('/dashboard')
    },
  })

  const handleSelectIndustry = (industryId: string) => {
    setSelectedIndustry(industryId)
  }

  const handleContinue = () => {
    if (selectedIndustry) {
      setIndustryMutation.mutate(selectedIndustry)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Select Your Industry
          </h1>
          <p className="text-lg text-gray-600">
            Choose your business type to enable industry-specific features
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {INDUSTRIES.map((industry) => (
            <Card
              key={industry.id}
              className={`cursor-pointer transition-all ${
                selectedIndustry === industry.id
                  ? `${industry.color} border-2 border-blue-500`
                  : `${industry.color} border`
              }`}
              onClick={() => handleSelectIndustry(industry.id)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{industry.icon}</span>
                  <div className="flex-1">
                    <CardTitle>{industry.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {industry.description}
                    </CardDescription>
                  </div>
                  {selectedIndustry === industry.id && (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!selectedIndustry || setIndustryMutation.isPending}
            className="px-8"
          >
            {setIndustryMutation.isPending
              ? 'Setting up your industry...'
              : 'Continue'}
          </Button>
          {selectedIndustry && (
            <p className="text-sm text-gray-500 mt-4">
              Industry-specific features will be automatically enabled
            </p>
          )}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Why Select Your Industry?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ <strong>Auto-enabled features:</strong> Get industry-specific tools automatically</li>
              <li>✅ <strong>Customized workflows:</strong> Workflows tailored to your business type</li>
              <li>✅ <strong>Relevant templates:</strong> Pre-configured templates for your industry</li>
              <li>✅ <strong>Better insights:</strong> Industry-specific analytics and reports</li>
              <li>✅ <strong>You can change this later:</strong> Update your industry anytime from settings</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
