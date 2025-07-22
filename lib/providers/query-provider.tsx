'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 60 * 1000, // 10 minutes - より現実的な時間に短縮
            gcTime: 30 * 60 * 1000, // 30 minutes - メモリ効率を考慮して短縮
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
            refetchOnMount: false, // キャッシュ優先でマウント時の再取得を無効化
            networkMode: 'online', // オンライン時のみクエリを実行
          },
          mutations: {
            retry: 1, // 1回だけリトライ（ネットワークエラーに対応）
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