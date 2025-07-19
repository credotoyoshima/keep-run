'use client'

import { useEffect } from 'react'
import { usePrefetch } from '@/lib/hooks/usePrefetch'

export function InitialDataLoaderAuth() {
  const { prefetchAllPages } = usePrefetch()

  useEffect(() => {
    // 本番環境では負荷軽減のため一時的にプリフェッチを無効化
    if (process.env.NODE_ENV === 'production') {
      console.log('Prefetch disabled in production environment')
      return
    }

    // 開発環境でのみプリフェッチを実行
    const timer = setTimeout(() => {
      prefetchAllPages()
    }, 1000)

    return () => clearTimeout(timer)
  }, [prefetchAllPages])

  return null
}