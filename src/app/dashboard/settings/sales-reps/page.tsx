'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface SalesRep {
  id: string
  userId: string
  name: string
  email: string
  specialization: string | null
  conversionRate: number
  isOnLeave: boolean
  leaveEndDate: string | null
  assignedLeadsCount: number
  dealsCount: number
}

export default function SalesRepsPage() {
  const queryClient = useQueryClient()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedRep, setSelectedRep] = useState<SalesRep | null>(null)
  const [isOnLeave, setIsOnLeave] = useState(false)
  const [leaveEndDate, setLeaveEndDate] = useState('')

  // Fetch sales reps
  const { data, isLoading } = useQuery<{ reps: SalesRep[] }>({
    queryKey: ['sales-reps'],
    queryFn: async () => {
      const response = await fetch('/api/sales-reps')
      if (!response.ok) throw new Error('Failed to fetch sales reps')
      return response.json()
    },
  })

  // Fetch users for creating new rep
  const { data: usersData } = useQuery<{ users: Array<{ id: string; name: string; email: string }> }>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me')
      if (!response.ok) throw new Error('Failed to fetch users')
      // In a real app, you'd have a users endpoint
      return { users: [] }
    },
    enabled: showCreateDialog,
  })

  // Create sales rep mutation
  const createRep = useMutation({
    mutationFn: async (data: { userId: string; specialization?: string }) => {
      const response = await fetch('/api/sales-reps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create sales rep')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-reps'] })
      setShowCreateDialog(false)
    },
  })

  // Update leave status mutation
  const updateLeave = useMutation({
    mutationFn: async (data: { repId: string; isOnLeave: boolean; leaveEndDate?: string }) => {
      const response = await fetch(`/api/sales-reps/${data.repId}/set-leave`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isOnLeave: data.isOnLeave,
          leaveEndDate: data.leaveEndDate || undefined,
        }),
      })
      if (!response.ok) throw new Error('Failed to update leave status')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-reps'] })
      setSelectedRep(null)
    },
  })

  const handleSetLeave = async (rep: SalesRep) => {
    setSelectedRep(rep)
    setIsOnLeave(!rep.isOnLeave)
  }

  const handleSaveLeave = async () => {
    if (!selectedRep) return
    await updateLeave.mutateAsync({
      repId: selectedRep.id,
      isOnLeave,
      leaveEndDate: leaveEndDate || undefined,
    })
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  const reps = data?.reps || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Representatives</h1>
          <p className="mt-2 text-gray-600">Manage your sales team and lead assignments</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>Add Sales Rep</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Team</CardTitle>
          <CardDescription>{reps.length} sales representatives</CardDescription>
        </CardHeader>
        <CardContent>
          {reps.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">No sales reps configured</p>
              <Button onClick={() => setShowCreateDialog(true)}>Add First Sales Rep</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Conversion Rate</TableHead>
                  <TableHead>Assigned Leads</TableHead>
                  <TableHead>Deals</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reps.map((rep) => (
                  <TableRow key={rep.id}>
                    <TableCell className="font-medium">{rep.name}</TableCell>
                    <TableCell>{rep.email}</TableCell>
                    <TableCell>{rep.specialization || '-'}</TableCell>
                    <TableCell>
                      {(rep.conversionRate * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>{rep.assignedLeadsCount}</TableCell>
                    <TableCell>{rep.dealsCount}</TableCell>
                    <TableCell>
                      {rep.isOnLeave ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                          On Leave
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetLeave(rep)}
                      >
                        {rep.isOnLeave ? 'Return from Leave' : 'Set Leave'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Leave Status Dialog */}
      {selectedRep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Set Leave Status</CardTitle>
              <CardDescription>
                {selectedRep.name} - {selectedRep.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isOnLeave}
                    onChange={(e) => setIsOnLeave(e.target.checked)}
                    className="rounded"
                  />
                  <span>On Leave</span>
                </label>
              </div>
              {isOnLeave && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Leave End Date (Optional)
                  </label>
                  <Input
                    type="datetime-local"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                  />
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRep(null)
                    setIsOnLeave(false)
                    setLeaveEndDate('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveLeave}
                  disabled={updateLeave.isPending}
                >
                  {updateLeave.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Dialog - Simplified for now */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Sales Rep</CardTitle>
              <CardDescription>
                Select a user to add as a sales representative
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Note: User selection interface will be added. For now, use the API directly or create via database.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
