'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

export function usePrefetch() {
  const queryClient = useQueryClient()

  const prefetchTimeBlocks = useCallback((page: number) => {
    return queryClient.prefetchQuery({
      queryKey: ['timeBlocks', page],
      queryFn: async () => {
        const response = await fetch(`/api/time-blocks?page=${page}&mode=page`)
        if (!response.ok) {
          // 401/403の場合はエラーを投げない（認証エラーは予期されるもの）
          if (response.status === 401 || response.status === 403) {
            return []
          }
          throw new Error('Failed to fetch time blocks')
        }
        const data = await response.json()
        return Array.isArray(data) ? data : []
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }, [queryClient])

  const prefetchTodos = useCallback(() => {
    return queryClient.prefetchQuery({
      queryKey: ['todos'],
      queryFn: async () => {
        const response = await fetch('/api/todos')
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            return []
          }
          throw new Error('Failed to fetch todos')
        }
        return response.json()
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }, [queryClient])

  const prefetchHabits = useCallback(() => {
    return queryClient.prefetchQuery({
      queryKey: ['habits'],
      queryFn: async () => {
        const response = await fetch('/api/habits')
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            return []
          }
          throw new Error('Failed to fetch habits')
        }
        return response.json()
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }, [queryClient])

  const prefetchEvaluations = useCallback((year?: number, month?: number) => {
    return queryClient.prefetchQuery({
      queryKey: ['evaluations', year, month],
      queryFn: async () => {
        let url = '/api/evaluations'
        const params = new URLSearchParams()
        if (year) params.append('year', year.toString())
        if (month) params.append('month', month.toString())
        if (params.toString()) url += `?${params.toString()}`

        const response = await fetch(url)
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            return []
          }
          throw new Error('Failed to fetch evaluations')
        }
        return response.json()
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }, [queryClient])

  const prefetchAllPages = useCallback(async () => {
    console.log('Starting parallel prefetch...')
    
    // Helper function for error handling
    const safePrefetch = async (prefetchFn: () => Promise<void>, name: string) => {
      try {
        await prefetchFn()
        console.log(`✓ Prefetched ${name}`)
      } catch (error) {
        console.log(`✗ Failed to prefetch ${name}:`, error)
        // Continue execution even if one prefetch fails
      }
    }

    // 並列でプリフェッチを実行（パフォーマンス向上）
    const prefetchPromises = [
      // 最重要: TimeBlocks Page 1-3
      safePrefetch(() => prefetchTimeBlocks(1), 'TimeBlocks Page 1'),
      safePrefetch(() => prefetchTimeBlocks(2), 'TimeBlocks Page 2'),
      safePrefetch(() => prefetchTimeBlocks(3), 'TimeBlocks Page 3'),
      
      // その他のデータ
      safePrefetch(() => prefetchTodos(), 'Todos'),
      safePrefetch(() => prefetchHabits(), 'Habits'),
      safePrefetch(
        () => prefetchEvaluations(new Date().getFullYear(), new Date().getMonth() + 1), 
        'Evaluations'
      ),
    ]
    
    // すべてのプリフェッチを並列実行
    await Promise.all(prefetchPromises)
    
    console.log('Parallel prefetch completed')
  }, [prefetchTimeBlocks, prefetchTodos, prefetchHabits, prefetchEvaluations])

  return {
    prefetchTimeBlocks,
    prefetchTodos,
    prefetchHabits,
    prefetchEvaluations,
    prefetchAllPages,
  }
}