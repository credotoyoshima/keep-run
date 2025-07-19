'use client'

import { useEffect, useState } from 'react'
import { usePrefetch } from '@/lib/hooks/usePrefetch'
import { createClient } from '@/lib/supabase/client'

export function InitialDataLoaderAuth() {
  const { prefetchAllPages } = usePrefetch()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // 認証状態を確認
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }

    checkAuth()
  }, [])

  useEffect(() => {
    // 認証されている場合のみプリフェッチを実行
    if (!isAuthenticated) return

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
  }, [isAuthenticated, prefetchAllPages])

  return null
}