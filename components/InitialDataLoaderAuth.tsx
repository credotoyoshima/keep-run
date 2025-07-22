'use client'

import { useEffect } from 'react'
import { usePrefetch } from '@/lib/hooks/usePrefetch'

export function InitialDataLoaderAuth() {
  const { prefetchTimeBlocks, prefetchTodos } = usePrefetch()

  useEffect(() => {
    // 遅延なしで最重要データのみプリフェッチ
    const prefetchEssentials = async () => {
      try {
        // DAYページで必要な最小限のデータのみ
        await Promise.all([
          prefetchTimeBlocks(1), // 最初のページのみ
          prefetchTodos()        // TODOデータ
        ])
        console.log('Essential data prefetched')
      } catch (error) {
        console.log('Prefetch failed:', error)
        // エラーでも続行（ページ表示は問題なし）
      }
    }
    
    prefetchEssentials()
  }, [prefetchTimeBlocks, prefetchTodos])

  return null
}