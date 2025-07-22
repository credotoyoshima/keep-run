'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5分（キャッシュを優先）
            gcTime: 30 * 60 * 1000, // 30分（長期保持）
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchInterval: false,
            retry: false, // リトライ無効化で高速化
            refetchOnMount: false, // キャッシュがあれば使用（超重要）
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