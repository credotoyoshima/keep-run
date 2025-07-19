'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 60 * 1000, // 30 minutes - データを30分間新鮮とみなす（大幅延長）
            gcTime: 60 * 60 * 1000, // 60 minutes - 1時間キャッシュを保持
            refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
            refetchOnReconnect: false, // 再接続時の再取得を無効化
            refetchInterval: false, // 定期的な再取得を無効化
            retry: (failureCount, error: Error & { status?: number }) => {
              // 401/403エラーはリトライしない
              if (error?.status === 401 || error?.status === 403) {
                return false
              }
              return failureCount < 1
            },
            refetchOnMount: 'always', // 初回は必ず取得、その後はキャッシュ優先
            networkMode: 'offlineFirst', // オフライン優先モード
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