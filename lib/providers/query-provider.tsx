'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

// QueryClientを外部で作成し、再利用可能にする
let globalQueryClient: QueryClient | undefined

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10 * 60 * 1000, // 10分に延長（キャッシュを最大限活用）
        gcTime: 60 * 60 * 1000, // 1時間に延長（より長期保持）
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        retry: false, // リトライ無効化で高速化
        refetchOnMount: false, // キャッシュがあれば使用（超重要）
        networkMode: 'offlineFirst', // オフラインファーストで高速化
      },
      mutations: {
        retry: false, // ミューテーションのリトライも無効化
        networkMode: 'offlineFirst',
      },
    },
  })
}

function getQueryClient() {
  if (typeof window === 'undefined') {
    // SSR時は毎回新しいインスタンスを作成
    return makeQueryClient()
  }
  // ブラウザ環境では同じインスタンスを再利用
  return globalQueryClient ?? (globalQueryClient = makeQueryClient())
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // クライアントインスタンスの最適化
  const [queryClient] = useState(getQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}