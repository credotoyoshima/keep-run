import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

// クライアントインスタンスをキャッシュ（シングルトン）
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  // 既存のインスタンスがあれば再利用
  if (!clientInstance) {
    clientInstance = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false, // URL解析をスキップして高速化
          storageKey: 'sb-pzwxrocchxqmdqeduwjy-auth-token', // ストレージキーを明示
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        },
        global: {
          headers: {
            'x-client-info': 'keep-run@1.0.0', // クライアント情報を追加
          },
        },
      }
    )
  }
  
  return clientInstance
}