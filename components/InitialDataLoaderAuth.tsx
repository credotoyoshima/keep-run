'use client'

// import { useEffect, useState } from 'react'
// import { usePrefetch } from '@/lib/hooks/usePrefetch'
// import { createClient } from '@/lib/supabase/client'

export function InitialDataLoaderAuth() {
  // プリフェッチ機能を一時的に無効化
  return null
  
  /* TODO: 認証エラーを解決後に有効化
  const { prefetchAllPages } = usePrefetch()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isReady, setIsReady] = useState(false)

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
        await prefetchAllPages()
      } catch (error) {
        // エラーは静かに処理（コンソールを汚さない）
      }
    }

    // 少し遅延させてから実行（初期レンダリングを妨げないため）
    const timer = setTimeout(loadData, 500)

    return () => clearTimeout(timer)
  }, [isReady, isAuthenticated, prefetchAllPages])

  return null
  */
}