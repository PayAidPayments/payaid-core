'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function getAuthHeaders() {
  const { token } = useAuthStore.getState()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

export default function ProfileSettingsPage() {
  const queryClient = useQueryClient()
  const { user, setUser } = useAuthStore()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await fetch('/api/settings/profile', {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Failed to fetch profile')
      return response.json()
    },
  })

  // Update profile
  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update profile')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      // Update auth store if email or name changed
      if (data.email || data.name) {
        setUser({ ...user, email: data.email || user?.email, name: data.name || user?.name })
      }
      setSuccess('Profile updated successfully!')
      setError('')
      setTimeout(() => setSuccess(''), 3000)
      // Clear password fields
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }))
    },
  })

  // Load profile data into form
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        avatar: profile.avatar || '',
        password: '',
        confirmPassword: '',
      })
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate password if provided
    if (formData.password) {
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }
    }

    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        avatar: formData.avatar,
      }
      
      // Only include password if provided
      if (formData.password) {
        updateData.password = formData.password
      }

      await updateProfile.mutateAsync(updateData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your personal information and account settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your name, email, and profile picture
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                {success}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Full Name *
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={updateProfile.isPending}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email Address *
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={updateProfile.isPending}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="avatar" className="text-sm font-medium">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  {formData.avatar && (
                    <div className="relative">
                      <img
                        src={formData.avatar}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      id="avatar"
                      name="avatar"
                      type="url"
                      value={formData.avatar}
                      onChange={handleChange}
                      placeholder="Enter image URL or upload file"
                      disabled={updateProfile.isPending}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter a URL to your profile picture, or use a service like imgur.com to upload
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your account password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  New Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current password"
                  disabled={updateProfile.isPending}
                />
                <p className="text-xs text-gray-500">
                  Minimum 8 characters
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  disabled={updateProfile.isPending}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Role</div>
                <div className="font-medium capitalize">{profile.role || 'Member'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Email Verified</div>
                <div className="font-medium">
                  {profile.emailVerified ? (
                    <span className="text-green-600">Verified</span>
                  ) : (
                    <span className="text-yellow-600">Not Verified</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Member Since</div>
                <div className="font-medium">
                  {profile.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString()
                    : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Last Login</div>
                <div className="font-medium">
                  {profile.lastLoginAt
                    ? new Date(profile.lastLoginAt).toLocaleDateString()
                    : 'Never'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
