'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/stores/auth'
import GeminiSetupWizard from '@/components/integrations/gemini-setup-wizard'

function getAuthHeaders() {
  const { token } = useAuthStore.getState()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

export default function AISettingsPage() {
  const [googleAiStudioConfigured, setGoogleAiStudioConfigured] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchIntegrations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/ai/integrations', {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Check Google AI Studio API key configuration
        if (data.configurations?.['google-ai-studio']) {
          setGoogleAiStudioConfigured(data.configurations['google-ai-studio'].configured)
        }
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key' })
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch('/api/settings/tenant', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          googleAiStudioApiKey: apiKey.trim(),
        }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'API key saved successfully!' })
        setApiKey('')
        fetchIntegrations() // Refresh status
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save API key')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save API key',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveApiKey = async () => {
    if (!confirm('Are you sure you want to remove your API key? You will not be able to generate images until you add it again.')) {
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch('/api/settings/tenant', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          googleAiStudioApiKey: null,
        }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'API key removed successfully' })
        fetchIntegrations() // Refresh status
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove API key')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to remove API key',
      })
    } finally {
      setIsSaving(false)
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Integrations</h1>
          <p className="mt-2 text-gray-600">
            Connect your AI service accounts for image generation and other AI features
          </p>
        </div>
        <Link href="/dashboard/settings">
          <Button variant="outline">Back to Settings</Button>
        </Link>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google AI Studio Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google AI Studio
          </CardTitle>
          <CardDescription>
            Configure Google AI Studio API key for free image generation using Gemini 2.5 Flash Image
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : googleAiStudioConfigured ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-green-800">✅ Configured</div>
                    <p className="text-sm text-green-700 mt-1">
                      Your Google AI Studio API key is configured and ready to use!
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      ⚠️ Each tenant uses their own API key. Your key will only be used for your account.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveApiKey}
                    disabled={isSaving}
                  >
                    Remove Key
                  </Button>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p className="mb-2">✨ You can now use Google AI Studio for image generation!</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Free image generation using Gemini 2.5 Flash Image</li>
                  <li>Your API key is configured and working</li>
                  <li>Go to <strong>Marketing &gt; Social Media &gt; Create Image</strong> to generate images</li>
                </ul>
              </div>
            </div>
          ) : showWizard ? (
            <GeminiSetupWizard
              onComplete={() => {
                setShowWizard(false)
                fetchIntegrations()
                setMessage({ type: 'success', text: 'Google Gemini connected successfully!' })
              }}
              onCancel={() => setShowWizard(false)}
            />
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="font-semibold text-yellow-800 mb-2">⚠️ Not Configured</div>
                <p className="text-sm text-yellow-700 mb-3">
                  Google AI Studio API key is not set. Each tenant must use their own API key. Your key will only be used for your account.
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-center">
                <p className="text-sm text-blue-800 mb-4">
                  Link your Google Gemini account in just 3 simple steps. No technical knowledge required!
                </p>
                <Button
                  onClick={() => setShowWizard(true)}
                  className="bg-blue-500 text-white hover:bg-blue-600 px-6 py-2"
                >
                  Link Google Gemini →
                </Button>
              </div>

              <div className="text-sm text-gray-600">
                <p className="font-semibold mb-2">Benefits:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>✅ Free image generation (generous free tier)</li>
                  <li>✅ Simple 3-step setup (no technical knowledge needed)</li>
                  <li>✅ High-quality images with Gemini 2.5 Flash Image</li>
                  <li>✅ Fast and reliable</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other AI Services Info */}
      <Card>
        <CardHeader>
          <CardTitle>Other AI Services</CardTitle>
          <CardDescription>
            Additional free options for AI-powered features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <div className="font-semibold mb-1">Self-Hosted (Hugging Face) - Free</div>
              <p className="text-gray-600">
                Use your own self-hosted AI models. Configure in docker-compose.ai-services.yml. 
                Set <code className="bg-gray-100 px-1 rounded">USE_AI_GATEWAY=true</code> in .env
              </p>
              <a 
                href="/AI_SERVICES_DEPLOYMENT.md" 
                target="_blank"
                className="text-blue-600 hover:underline text-xs mt-1 inline-block"
              >
                📖 View setup guide →
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
          <CardDescription>
            Common issues and solutions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold text-red-600 mb-1">Error: &quot;Google AI Studio not configured&quot;</div>
              <p className="text-gray-600 mb-2">
                This means the API key is not set or the server hasn&apos;t been restarted.
              </p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Verify <code className="bg-gray-100 px-1 rounded">GOOGLE_AI_STUDIO_API_KEY</code> is in your <code className="bg-gray-100 px-1 rounded">.env</code> file</li>
                <li>Make sure there are no extra spaces or quotes around the key</li>
                <li>Restart your dev server after adding the key</li>
                <li>Check server logs for detailed error messages</li>
              </ol>
            </div>
            <div>
              <div className="font-semibold text-red-600 mb-1">Error: &quot;API error&quot; when generating images</div>
              <p className="text-gray-600 mb-2">
                This could mean the API key is invalid or you&apos;ve exceeded the quota.
              </p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Verify your API key is correct at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-600 hover:underline">Google AI Studio</a></li>
                <li>Check if you&apos;ve exceeded the free tier quota</li>
                <li>Verify the Generative Language API is enabled in your Google Cloud project</li>
                <li>Check server logs for detailed error messages</li>
              </ol>
            </div>
            <a 
              href="/GOOGLE_AI_STUDIO_SETUP.md" 
              target="_blank"
              className="text-blue-600 hover:underline text-xs mt-2 inline-block"
            >
              📖 View detailed setup guide →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
