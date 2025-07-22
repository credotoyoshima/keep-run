'use client'

import { useQueryClient } from '@tanstack/react-query'
import { TodoMobile } from './TodoMobile'

export function TodoPageClient() {
  const queryClient = useQueryClient()

  // プルトゥリフレッシュ処理
  const handleRefresh = async () => {
    try {
      // Todoデータの更新
      await queryClient.invalidateQueries({ 
        queryKey: ['todos'],
        exact: false
      })
      
      console.log('Todo data refreshed successfully')
    } catch (error) {
      console.log('Todo refresh failed:', error)
    }
  }

  return <TodoMobile onRefresh={handleRefresh} />
}