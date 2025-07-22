'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthMobile } from '@/components/auth/AuthMobile'

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 高速化：まずローカルストレージをチェック
        const storedSession = localStorage.getItem('sb-pzwxrocchxqmdqeduwjy-auth-token')
        
        if (storedSession) {
          // セッションがある場合は即座にリダイレクト（検証は後で）
          setIsAuthenticated(true)
          router.replace('/day')
          return
        }
        
        // ローカルストレージにない場合のみSupabaseチェック
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setIsAuthenticated(true)
          router.replace('/day')
          return
        }
        
        setIsAuthenticated(false)
        
      } catch (error) {
        console.log('Auth check failed:', error)
        setIsAuthenticated(false)
      }
    }

    checkAuth()

    // 最適化：より軽量なリアルタイム認証状態監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsAuthenticated(true)
        router.replace('/day')
      } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // 必要なイベントのみ処理
        setIsAuthenticated(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  // 認証中のローディング画面（シンプル）
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">認証確認中...</div>
      </div>
    )
  }

  // 認証済みの場合はローディング表示（リダイレクト中）
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">リダイレクト中...</div>
      </div>
    )
  }
  
  return <AuthMobile />
}
