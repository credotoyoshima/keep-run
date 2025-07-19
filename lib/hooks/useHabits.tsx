import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Habit {
  id: string
  name: string
  color: string
  icon: string
  targetValue: number
  unit: string
  frequency: string
  orderIndex: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface HabitValue {
  id: string
  habitId: string
  date: Date
  value: number
  createdAt: Date
  updatedAt: Date
}

export function useHabits() {
  const queryClient = useQueryClient()

  const { data: habits = [], isLoading, error } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const response = await fetch('/api/habits')
      if (!response.ok) {
        throw new Error('Failed to fetch habits')
      }
      return response.json()
    },
  })

  // Add habit mutation
  const addHabitMutation = useMutation({
    mutationFn: async (newHabit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHabit)
      })
      if (!response.ok) throw new Error('Failed to add habit')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
    }
  })

  // Update habit mutation
  const updateHabitMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Habit> & { id: string }) => {
      const response = await fetch(`/api/habits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!response.ok) throw new Error('Failed to update habit')
      return response.json()
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] })
      const previousHabits = queryClient.getQueryData(['habits'])
      
      queryClient.setQueryData(['habits'], (old: Habit[] = []) => {
        return old.map(habit => 
          habit.id === id ? { ...habit, ...updates } : habit
        )
      })
      
      return { previousHabits }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['habits'], context?.previousHabits)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
    }
  })

  // Delete habit mutation
  const deleteHabitMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/habits/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete habit')
      return response.json()
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] })
      const previousHabits = queryClient.getQueryData(['habits'])
      
      queryClient.setQueryData(['habits'], (old: Habit[] = []) => {
        return old.filter(habit => habit.id !== id)
      })
      
      return { previousHabits }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['habits'], context?.previousHabits)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
    }
  })

  return {
    habits,
    isLoading,
    error,
    addHabit: addHabitMutation.mutate,
    updateHabit: updateHabitMutation.mutate,
    deleteHabit: deleteHabitMutation.mutate,
  }
}

export function useHabitValues(habitId: string, date: Date) {
  const queryClient = useQueryClient()
  const dateString = date.toISOString().split('T')[0]

  const { data: habitValues = [], isLoading, error } = useQuery({
    queryKey: ['habitValues', habitId, dateString],
    queryFn: async () => {
      const response = await fetch(`/api/habits/${habitId}/values?date=${dateString}`)
      if (!response.ok) {
        throw new Error('Failed to fetch habit values')
      }
      return response.json()
    },
  })

  // Update habit value mutation
  const updateHabitValueMutation = useMutation({
    mutationFn: async ({ value }: { value: number }) => {
      const response = await fetch(`/api/habits/${habitId}/values`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateString, value })
      })
      if (!response.ok) throw new Error('Failed to update habit value')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitValues', habitId, dateString] })
    }
  })

  return {
    habitValues,
    isLoading,
    error,
    updateHabitValue: updateHabitValueMutation.mutate,
  }
}