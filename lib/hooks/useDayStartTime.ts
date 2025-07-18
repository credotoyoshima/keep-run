import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_DAY_START_TIME = '05:00'

export function useDayStartTime() {
  const [dayStartTime, setDayStartTime] = useState<string>(DEFAULT_DAY_START_TIME)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const supabase = createClient()

  // 設定を取得する関数
  const fetchSettings = useCallback(async () => {
    try {
      // 1. まずlocalStorageから即座に読み込み（UX優先）
      if (typeof window !== 'undefined') {
        const localValue = localStorage.getItem('dayStartTime')
        if (localValue) {
          setDayStartTime(localValue)
          setIsLoading(false)
        }
      }

      // 2. 認証状態を確認
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setIsAuthenticated(true)
        // DBから取得
        const response = await fetch('/api/user/settings')
        if (response.ok) {
          const data = await response.json()
          if (data.dayStartTime) {
            setDayStartTime(data.dayStartTime)
            // DBの値でlocalStorageを更新（真実の単一ソース）
            localStorage.setItem('dayStartTime', data.dayStartTime)
          }
        } else if (response.status === 404) {
          // ユーザーが見つからない場合はlocalStorageの値を使用
          console.warn('User settings not found, using local value')
        }
      } else {
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Error fetching day start time:', error)
      setError('設定の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 設定を更新する関数
  const updateDayStartTime = useCallback(async (newTime: string) => {
    try {
      // 1. 楽観的更新 - 即座にUIを更新
      setDayStartTime(newTime)
      if (typeof window !== 'undefined') {
        localStorage.setItem('dayStartTime', newTime)
        
        // カスタムイベントを発火（同じタブ内の他のコンポーネントに通知）
        window.dispatchEvent(new CustomEvent('dayStartTimeChanged', { detail: newTime }))
      }

      // 2. 認証済みならDBを更新
      if (isAuthenticated) {
        const response = await fetch('/api/user/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dayStartTime: newTime })
        })

        if (!response.ok) {
          throw new Error('Failed to update settings')
        }

        return { success: true }
      }

      // 未認証の場合もlocalStorageには保存済みなので成功とする
      return { success: true }
    } catch (error) {
      console.error('Error updating day start time:', error)
      // エラー時は元の値に戻す（実装によってはリトライも可能）
      const previousValue = localStorage.getItem('dayStartTime') || DEFAULT_DAY_START_TIME
      setDayStartTime(previousValue)
      setError('設定の保存に失敗しました')
      return { success: false, error: '設定の保存に失敗しました' }
    }
  }, [isAuthenticated])

  // 初期化
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // 設定変更の監視
  useEffect(() => {
    // 他のタブやコンポーネントからの変更を監視
    const handleDayStartTimeChange = (event: CustomEvent) => {
      setDayStartTime(event.detail)
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'dayStartTime' && event.newValue) {
        setDayStartTime(event.newValue)
      }
    }

    window.addEventListener('dayStartTimeChanged', handleDayStartTimeChange as EventListener)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('dayStartTimeChanged', handleDayStartTimeChange as EventListener)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return {
    dayStartTime,
    updateDayStartTime,
    isLoading,
    error,
    refetch: fetchSettings
  }
}