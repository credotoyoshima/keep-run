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
        // 最速認証チェック：sessionから確認
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          setIsAuthenticated(true)
          // 即座にリダイレクト（prefetchなし）
          router.replace('/day')
          return
        }

        // セッションがない場合のみユーザー確認
        const { data: { user } } = await supabase.auth.getUser()
        setIsAuthenticated(!!user)
        
        if (user) {
          router.replace('/day')
        }
      } catch (error) {
        console.log('Auth check failed:', error)
        setIsAuthenticated(false)
      }
    }

    checkAuth()

    // リアルタイム認証状態監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true)
        router.replace('/day')
      } else {
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
