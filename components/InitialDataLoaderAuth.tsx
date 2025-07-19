'use client'

import { useEffect } from 'react'
import { usePrefetch } from '@/lib/hooks/usePrefetch'

export function InitialDataLoaderAuth() {
  const { prefetchAllPages } = usePrefetch()

  useEffect(() => {
    // 段階的プリフェッチにより本番環境でも安全に実行
    const timer = setTimeout(() => {
      prefetchAllPages()
    }, 2000) // 本番環境では少し長めの遅延で安全性を確保

    return () => clearTimeout(timer)
  }, [prefetchAllPages])

  return null
}