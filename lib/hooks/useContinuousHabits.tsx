import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDayStartTime } from './useDayStartTime'
import { getTodayInJST, formatDateString } from '@/lib/date-utils'

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
  const { dayStartTime } = useDayStartTime()

  const { data, isLoading, error } = useQuery({
    queryKey: ['continuousHabits'],
    queryFn: async () => {
      const response = await fetch('/api/habits')
      if (!response.ok) {
        throw new Error('Failed to fetch habits')
      }
      return response.json()
    },
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
        body: JSON.stringify({ completed, dayStartTime })
      })
      if (!response.ok) throw new Error('Failed to record habit')
      return response.json()
    },
    onMutate: async ({ habitId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['continuousHabits'] })
      const previousData = queryClient.getQueryData(['continuousHabits'])
      
      // 楽観的更新
      queryClient.setQueryData(['continuousHabits'], (old: any) => {
        if (old?.id === habitId) {
          // dayStartTimeを考慮した今日の日付を取得
          const today = getTodayInJST(dayStartTime)
          const todayStr = formatDateString(today)
          
          // records配列を更新
          const updatedRecords = [...(old.records || [])]
          const todayRecordIndex = updatedRecords.findIndex(r => r.date === todayStr)
          
          if (todayRecordIndex >= 0) {
            // 既存の記録を更新
            updatedRecords[todayRecordIndex] = { ...updatedRecords[todayRecordIndex], completed }
          } else {
            // 新しい記録を追加
            updatedRecords.push({ date: todayStr, completed })
          }
          
          // completedDaysを再計算（習慣開始日以降のもののみ）
          const startDate = new Date(old.startDate)
          const completedDays = updatedRecords.filter(r => 
            r.completed && new Date(r.date) >= startDate
          ).length
          
          return { 
            ...old, 
            todayCompleted: completed,
            records: updatedRecords,
            completedDays
          }
        }
        return old
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