'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes - データを5分間新鮮とみなす
            gcTime: 10 * 60 * 1000, // 10 minutes - 10分間キャッシュを保持
            refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
            retry: 1,
            refetchOnMount: false, // マウント時の再取得を無効化（キャッシュがある場合）
          },
          mutations: {
            retry: 0, // ミューテーションはリトライしない
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