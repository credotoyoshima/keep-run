'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

export function usePrefetch() {
  const queryClient = useQueryClient()

  const prefetchTimeBlocks = useCallback((page: number) => {
    return queryClient.prefetchQuery({
      queryKey: ['timeBlocks', page],
      queryFn: async () => {
        const response = await fetch(`/api/user-blocks?page=${page}`)
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
    try {
      // DAYページのデータをプリフェッチ（1-3ページ）
      await Promise.allSettled([
        prefetchTimeBlocks(1),
        prefetchTimeBlocks(2),
        prefetchTimeBlocks(3),
      ])
      
      // その他のページのデータをプリフェッチ
      await Promise.allSettled([
        prefetchTodos(),
        prefetchHabits(),
        prefetchEvaluations(new Date().getFullYear(), new Date().getMonth() + 1),
      ])
    } catch (error) {
      // エラーは静かに処理
      console.log('Prefetch completed with some errors')
    }
  }, [prefetchTimeBlocks, prefetchTodos, prefetchHabits, prefetchEvaluations])

  return {
    prefetchTimeBlocks,
    prefetchTodos,
    prefetchHabits,
    prefetchEvaluations,
    prefetchAllPages,
  }
}