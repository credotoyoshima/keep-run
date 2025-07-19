import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_DAY_START_TIME = '05:00'

// グローバルなdayStartTime取得フック
export function useDayStartTimeGlobal() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data: dayStartTime = DEFAULT_DAY_START_TIME, isLoading, error } = useQuery({
    queryKey: ['userSettings', 'dayStartTime'],
    queryFn: async () => {
      // 1. LocalStorageから即座に取得（キャッシュ層1）
      if (typeof window !== 'undefined') {
        const localValue = localStorage.getItem('dayStartTime')
        if (localValue) {
          return localValue
        }
      }

      // 2. 認証チェックとDB取得
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return DEFAULT_DAY_START_TIME
      }

      const response = await fetch('/api/user/settings')
      if (response.ok) {
        const data = await response.json()
        const time = data.dayStartTime || DEFAULT_DAY_START_TIME
        
        // LocalStorageに保存
        if (typeof window !== 'undefined') {
          localStorage.setItem('dayStartTime', time)
        }
        
        return time
      }
      
      return DEFAULT_DAY_START_TIME
    },
    staleTime: 10 * 60 * 1000, // 10分間キャッシュ
    gcTime: 30 * 60 * 1000,    // 30分間保持
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  // バックグラウンド同期
  const syncWithDatabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const response = await fetch('/api/user/settings')
        if (response.ok) {
          const data = await response.json()
          if (data.dayStartTime) {
            queryClient.setQueryData(['userSettings', 'dayStartTime'], data.dayStartTime)
            localStorage.setItem('dayStartTime', data.dayStartTime)
          }
        }
      }
    } catch (error) {
      console.warn('Background sync failed:', error)
    }
  }

  const updateDayStartTime = async (newTime: string) => {
    // 楽観的更新
    queryClient.setQueryData(['userSettings', 'dayStartTime'], newTime)
    localStorage.setItem('dayStartTime', newTime)

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayStartTime: newTime })
      })

      if (!response.ok) {
        throw new Error('Failed to update')
      }

      return { success: true }
    } catch (error) {
      // ロールバック
      const previous = localStorage.getItem('dayStartTime') || DEFAULT_DAY_START_TIME
      queryClient.setQueryData(['userSettings', 'dayStartTime'], previous)
      return { success: false, error }
    }
  }

  return {
    dayStartTime,
    updateDayStartTime,
    isLoading,
    error
  }
}