import { useQueries } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// 複数データの並列取得用フック
export function useOptimizedData() {
  const supabase = createClient()

  const results = useQueries({
    queries: [
      // 1. ユーザー設定（最優先）
      {
        queryKey: ['userSettings', 'dayStartTime'],
        queryFn: async () => {
          // LocalStorageから即座に返す
          if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('dayStartTime')
            if (cached) return cached
          }

          const response = await fetch('/api/user/settings')
          if (response.ok) {
            const data = await response.json()
            if (data.dayStartTime && typeof window !== 'undefined') {
              localStorage.setItem('dayStartTime', data.dayStartTime)
            }
            return data.dayStartTime || '05:00'
          }
          return '05:00'
        },
        staleTime: 10 * 60 * 1000,
        refetchOnMount: false,
      },
      // 2. 認証状態
      {
        queryKey: ['auth', 'user'],
        queryFn: async () => {
          const { data: { user } } = await supabase.auth.getUser()
          return user
        },
        staleTime: 5 * 60 * 1000,
        refetchOnMount: false,
      }
    ]
  })

  const [settingsQuery, authQuery] = results

  return {
    dayStartTime: settingsQuery.data || '05:00',
    user: authQuery.data,
    isSettingsLoading: settingsQuery.isLoading,
    isAuthLoading: authQuery.isLoading,
    isLoading: settingsQuery.isLoading || authQuery.isLoading
  }
}