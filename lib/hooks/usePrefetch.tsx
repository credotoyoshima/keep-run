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
    console.log('Starting staged prefetch...')
    
    // Helper function for delayed execution with error handling
    const safePrefetch = async (prefetchFn: () => Promise<void>, name: string, delay: number = 0) => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      try {
        await prefetchFn()
        console.log(`✓ Prefetched ${name}`)
      } catch (error) {
        console.log(`✗ Failed to prefetch ${name}:`, error)
        // Continue execution even if one prefetch fails
      }
    }

    // Stage 1: Most important data (DAY page 1)
    await safePrefetch(() => prefetchTimeBlocks(1), 'TimeBlocks Page 1')
      
    // Stage 2: Secondary important data (500ms delay)
    await safePrefetch(() => prefetchTodos(), 'Todos', 500)
    
    // Stage 3: Additional data (300ms delay)  
    await safePrefetch(() => prefetchHabits(), 'Habits', 300)
    
    // Stage 4: Supplementary data (300ms delay)
    await safePrefetch(
      () => prefetchEvaluations(new Date().getFullYear(), new Date().getMonth() + 1), 
      'Evaluations', 
      300
    )
    
    // Stage 5: Extended DAY pages (400ms delay)
    await safePrefetch(() => prefetchTimeBlocks(2), 'TimeBlocks Page 2', 400)
    
    // Stage 6: Final DAY page (300ms delay)
    await safePrefetch(() => prefetchTimeBlocks(3), 'TimeBlocks Page 3', 300)
    
    console.log('Staged prefetch completed')
  }, [prefetchTimeBlocks, prefetchTodos, prefetchHabits, prefetchEvaluations])

  return {
    prefetchTimeBlocks,
    prefetchTodos,
    prefetchHabits,
    prefetchEvaluations,
    prefetchAllPages,
  }
}