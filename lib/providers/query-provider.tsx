'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30秒（短縮）
            gcTime: 5 * 60 * 1000, // 5分（短縮）
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchInterval: false,
            retry: false, // リトライ無効化で高速化
            refetchOnMount: 'always', // 常に最新データを取得
            networkMode: 'online',
          },
          mutations: {
            retry: false, // ミューテーションのリトライも無効化
            networkMode: 'online',
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}