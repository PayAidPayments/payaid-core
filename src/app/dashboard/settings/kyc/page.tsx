'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function getAuthHeaders() {
  const { token } = useAuthStore.getState()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

interface KYCDocument {
  type: string
  name: string
  description: string
  acceptedFormats: string[]
  maxSizeMB: number
  required: boolean
}

const KYC_DOCUMENTS: KYCDocument[] = [
  {
    type: 'pan',
    name: 'PAN Card',
    description: 'Permanent Account Number card issued by Income Tax Department',
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMB: 2,
    required: true,
  },
  {
    type: 'aadhaar',
    name: 'Aadhaar Card',
    description: 'Aadhaar card issued by UIDAI (front and back)',
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMB: 5,
    required: true,
  },
  {
    type: 'bank_statement',
    name: 'Bank Statement',
    description: 'Latest 3 months bank statement',
    acceptedFormats: ['PDF'],
    maxSizeMB: 10,
    required: true,
  },
  {
    type: 'gst_certificate',
    name: 'GST Certificate',
    description: 'GST registration certificate (if applicable)',
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMB: 2,
    required: false,
  },
  {
    type: 'incorporation_certificate',
    name: 'Incorporation Certificate',
    description: 'Company incorporation certificate (for companies)',
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMB: 5,
    required: false,
  },
  {
    type: 'address_proof',
    name: 'Address Proof',
    description: 'Utility bill, rent agreement, or other address proof',
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMB: 5,
    required: true,
  },
]

export default function KYCPage() {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { url: string; uploadedAt: string }>>({})

  const handleFileUpload = async (docType: string, file: File) => {
    const doc = KYC_DOCUMENTS.find(d => d.type === docType)
    if (!doc) return

    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const acceptedExtensions = doc.acceptedFormats.map(f => f.toLowerCase())
    if (!fileExtension || !acceptedExtensions.includes(fileExtension)) {
      alert(`Invalid file type. Accepted formats: ${doc.acceptedFormats.join(', ')}`)
      return
    }

    // Validate file size
    const maxSizeBytes = doc.maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      alert(`File size exceeds ${doc.maxSizeMB}MB limit`)
      return
    }

    setUploading(docType)
    try {
      // For now, we'll use a placeholder URL
      // In production, upload to Cloudflare R2 or similar storage
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', docType)

      const response = await fetch('/api/upload/kyc', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          // Don't set Content-Type for FormData, browser will set it
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      setUploadedDocs(prev => ({
        ...prev,
        [docType]: {
          url: data.url,
          uploadedAt: new Date().toISOString(),
        },
      }))
    } catch (error) {
      alert('Failed to upload document. Please try again.')
      console.error('Upload error:', error)
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">KYC Verification</h1>
        <p className="mt-2 text-gray-600">
          Complete your Know Your Customer (KYC) verification as per Indian regulations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>KYC Status</CardTitle>
          <CardDescription>
            Upload the required documents to complete your KYC verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {KYC_DOCUMENTS.map((doc) => {
              const uploaded = uploadedDocs[doc.type]
              return (
                <div
                  key={doc.type}
                  className="p-4 border border-gray-200 rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{doc.name}</h3>
                        {doc.required && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            Required
                          </span>
                        )}
                        {uploaded && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            ✓ Uploaded
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        <p>Accepted formats: {doc.acceptedFormats.join(', ')}</p>
                        <p>Maximum file size: {doc.maxSizeMB}MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept={doc.acceptedFormats.map(f => `.${f.toLowerCase()}`).join(',')}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleFileUpload(doc.type, file)
                          }
                        }}
                        disabled={uploading === doc.type}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant={uploaded ? 'outline' : 'default'}
                        disabled={uploading === doc.type}
                        asChild
                      >
                        <span>
                          {uploading === doc.type
                            ? 'Uploading...'
                            : uploaded
                            ? 'Replace Document'
                            : 'Upload Document'}
                        </span>
                      </Button>
                    </label>
                    {uploaded && (
                      <a
                        href={uploaded.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View Document
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>KYC Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• All documents must be clear and legible</p>
            <p>• Documents should be in color (not black and white)</p>
            <p>• Ensure all information is visible and not cropped</p>
            <p>• Documents should be recent (not older than 3 months for bank statements)</p>
            <p>• File names should be descriptive (e.g., &quot;PAN_Card_John_Doe.pdf&quot;)</p>
            <p>• Your KYC verification will be reviewed within 2-3 business days</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
