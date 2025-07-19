'use client'

import { useEffect } from 'react'
import { usePrefetch } from '@/lib/hooks/usePrefetch'

export function InitialDataLoaderAuth() {
  const { prefetchAllPages } = usePrefetch()

  useEffect(() => {
    // ページ読み込み後にプリフェッチを実行
    const timer = setTimeout(() => {
      prefetchAllPages()
    }, 1000) // 1秒後に実行してメインページの読み込みを妨げない

    return () => clearTimeout(timer)
  }, [prefetchAllPages])

  return null
}