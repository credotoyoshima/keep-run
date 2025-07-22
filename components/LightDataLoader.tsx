'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function LightDataLoader() {
  const queryClient = useQueryClient()

  useEffect(() => {
    // 軽量プリフェッチ（エラー時は無視）
    const prefetchEssentials = async () => {
      try {
        // DAYページの最重要データのみ（高速API使用）
        await queryClient.prefetchQuery({
          queryKey: ['timeBlocksFast', 1],
          queryFn: async () => {
            const response = await fetch('/api/time-blocks-fast?page=1&mode=page')
            if (!response.ok) return []
            const data = await response.json()
            return Array.isArray(data) ? data : []
          },
          staleTime: 30 * 1000, // 30秒間キャッシュに短縮
        })
        
        console.log('Light prefetch completed')
      } catch (error) {
        console.log('Light prefetch failed (ignored):', error)
        // エラーは無視（ページ表示には影響しない）
      }
    }
    
    // 遅延を短縮してよりレスポンシブに
    const timer = setTimeout(prefetchEssentials, 100)
    return () => clearTimeout(timer)
  }, [queryClient])

  return null
} 