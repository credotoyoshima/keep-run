'use client'

import { Suspense } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { OptimizedDayView } from './OptimizedDayView'

export function DayPageClient() {
  const queryClient = useQueryClient()

  // DAYページ専用のプルトゥリフレッシュ処理
  const handleDayRefresh = async () => {
    try {
      // 高速APIのキャッシュを無効化して最新データを取得
      await queryClient.invalidateQueries({ 
        queryKey: ['timeBlocksFast'],
        exact: false // 全てのページのtimeBlocksFastを更新
      })

      // ユーザー設定も更新
      await queryClient.invalidateQueries({ 
        queryKey: ['userSettings']
      })

      console.log('Day page refreshed successfully')
    } catch (error) {
      console.log('Day refresh failed:', error)
    }
  }

  return (
    <Suspense fallback={<div className="p-4 text-gray-500">読み込み中...</div>}>
      <OptimizedDayView onRefresh={handleDayRefresh} />
    </Suspense>
  )
}