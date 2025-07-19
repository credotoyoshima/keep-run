'use client'

import { useEffect } from 'react'
import { usePrefetch } from '@/lib/hooks/usePrefetch'

export function InitialDataLoader() {
  const { prefetchAllPages } = usePrefetch()

  useEffect(() => {
    // アプリ起動時にすべてのページのデータをバックグラウンドでプリフェッチ
    const loadData = async () => {
      try {
        await prefetchAllPages()
      } catch (error) {
        console.error('Failed to prefetch data:', error)
      }
    }

    // 少し遅延させてから実行（初期レンダリングを妨げないため）
    const timer = setTimeout(loadData, 100)

    return () => clearTimeout(timer)
  }, [prefetchAllPages])

  return null
}