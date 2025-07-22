import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface HabitRecord {
  date: string
  completed: boolean
}

interface ContinuousHabit {
  id: string
  title: string
  category: string
  startDate: string
  targetDays: number
  completedDays: number
  records: HabitRecord[]
  todayCompleted: boolean
  canCompleteToday: boolean
  shouldReset?: boolean
  isCompleted?: boolean
}

export function useContinuousHabits() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['continuousHabits'],
    queryFn: async () => {
      const response = await fetch('/api/habits')
      if (!response.ok) {
        throw new Error('Failed to fetch habits')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5分間キャッシュを有効
    refetchOnWindowFocus: false,
    refetchOnMount: false, // キャッシュ優先
  })

  // 現在のアクティブな習慣と新規作成可能フラグを処理
  const currentHabit: ContinuousHabit | null = data?.id ? data : null
  const canCreateNew: boolean = data?.canCreateNew || false

  // 習慣作成 mutation
  const createHabitMutation = useMutation({
    mutationFn: async (habitData: { title: string; category: string; targetDays?: number }) => {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(habitData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create habit')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['continuousHabits'] })
    }
  })

  // 習慣記録 mutation
  const recordHabitMutation = useMutation({
    mutationFn: async ({ habitId, completed }: { habitId: string; completed: boolean }) => {
      const response = await fetch(`/api/habits/${habitId}/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      })
      if (!response.ok) throw new Error('Failed to record habit')
      return response.json()
    },
    onMutate: async ({ habitId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['continuousHabits'] })
      const previousData = queryClient.getQueryData(['continuousHabits'])
      
      // 楽観的更新: todayCompletedだけでなくcompletedDaysとrecordsも更新
      queryClient.setQueryData(['continuousHabits'], (old: any) => {
        if (!old || old.id !== habitId) return old
        const todayString = new Date().toISOString().split('T')[0]
        // completedDaysを増減
        const delta = completed ? 1 : -1
        // recordsを追加または削除
        const updatedRecords = completed
          ? [...old.records, { date: todayString, completed }]
          : old.records.filter((r: any) => r.date !== todayString)
        return {
          ...old,
          todayCompleted: completed,
          completedDays: old.completedDays + delta,
          records: updatedRecords
        }
      })
      
      return { previousData }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['continuousHabits'], context?.previousData)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['continuousHabits'] })
    }
  })

  // 習慣リセット mutation
  const resetHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const response = await fetch(`/api/habits/${habitId}/reset`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to reset habit')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['continuousHabits'] })
    }
  })

  return {
    currentHabit,
    canCreateNew,
    isLoading,
    error,
    createHabit: createHabitMutation.mutate,
    recordHabit: recordHabitMutation.mutate,
    resetHabit: resetHabitMutation.mutate,
    isCreating: createHabitMutation.isPending,
    isRecording: recordHabitMutation.isPending,
    isResetting: resetHabitMutation.isPending,
  }
} 