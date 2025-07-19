'use client'

import { useEffect, useState } from 'react'
import { usePrefetch } from '@/lib/hooks/usePrefetch'
import { createClient } from '@/lib/supabase/client'
import { useDayStartTimeGlobal } from '@/lib/hooks/useDayStartTimeGlobal'

export function InitialDataLoaderAuth() {
  const { prefetchAllPages } = usePrefetch()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isReady, setIsReady] = useState(false)
  
  // 設定を事前読み込み（最優先）
  const { dayStartTime } = useDayStartTimeGlobal()

  useEffect(() => {
    // 認証状態を確認
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      setIsReady(true)
    }

    checkAuth()

    // 認証状態の変更を監視
    const { data: { subscription } } = createClient().auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    // 準備ができていない、または認証されていない場合は実行しない
    if (!isReady || !isAuthenticated) return

    const loadData = async () => {
      try {
        // 設定が読み込まれてからプリフェッチ開始
        if (dayStartTime) {
          await prefetchAllPages()
        }
      } catch (error) {
        // エラーは静かに処理（コンソールを汚さない）
        console.warn('Prefetch failed:', error)
      }
    }

    // バックグラウンドで実行（UI描画を妨げない）
    const timer = setTimeout(loadData, 100)

    return () => clearTimeout(timer)
  }, [isReady, isAuthenticated, dayStartTime, prefetchAllPages])

  return null
}