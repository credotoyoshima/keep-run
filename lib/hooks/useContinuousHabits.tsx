import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

export function useContinuousHabits(dayStartTime: string = '05:00') {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['continuousHabits'],
    queryFn: async () => {
      const response = await fetch('/api/habits')
      if (!response.ok) {
        throw new Error('Failed to fetch habits')
      }
      const result = await response.json()
      
      console.log('[DEBUG Frontend] GET /api/habits response:', {
        hasData: !!result,
        isHabit: !!result?.id,
        completedDays: result?.completedDays,
        todayCompleted: result?.todayCompleted,
        recordsCount: result?.records?.length,
        records: result?.records?.map((r: any) => ({
          date: r.date,
          completed: r.completed
        }))
      })
      
      return result
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
        body: JSON.stringify({ completed, dayStartTime }) // dayStartTimeを送信
      })
      if (!response.ok) throw new Error('Failed to record habit')
      return response.json()
    },
    onMutate: async ({ habitId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['continuousHabits'] })
      const previousData = queryClient.getQueryData(['continuousHabits'])
      
      // API側と同じ日付計算を使用（修正）
      const today = getTodayInJST(dayStartTime)
      const todayString = formatDateString(today)
      
      // 楽観的更新: todayCompletedだけでなくcompletedDaysとrecordsも更新
      queryClient.setQueryData(['continuousHabits'], (old: any) => {
        if (!old || old.id !== habitId) return old
        
        // 既存の今日の記録を確認
        const existingTodayRecord = old.records.find((r: any) => r.date === todayString)
        
        // completedDaysの正確な計算
        let newCompletedDays = old.completedDays
        if (completed && !existingTodayRecord?.completed) {
          newCompletedDays += 1 // 新規完了
        } else if (!completed && existingTodayRecord?.completed) {
          newCompletedDays -= 1 // 完了取り消し
        }
        
        // recordsの更新
        let updatedRecords
        if (completed) {
          // 完了の場合：既存記録を更新または新規追加
          updatedRecords = existingTodayRecord
            ? old.records.map((r: any) => r.date === todayString ? { ...r, completed: true } : r)
            : [...old.records, { date: todayString, completed: true }]
        } else {
          // 取り消しの場合：該当記録を削除または未完了に更新
          updatedRecords = old.records.map((r: any) => 
            r.date === todayString ? { ...r, completed: false } : r
          )
        }
        
        return {
          ...old,
          todayCompleted: completed,
          completedDays: newCompletedDays,
          records: updatedRecords
        }
      })
      
      return { previousData }
    },
    onError: (err, variables, context) => {
      console.error('Record habit error:', err)
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