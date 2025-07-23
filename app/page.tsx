'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'

// AuthMobileを動的インポートでロード
const AuthMobile = dynamic(() => import('@/components/auth/AuthMobile').then(mod => ({ default: mod.AuthMobile })), {
  ssr: false,
  loading: () => null
})

export default function HomePage() {
  const [showAuth, setShowAuth] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Supabaseクライアントを作成
        const supabase = createClient()
        
        // セッションを確認
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // 認証済みの場合はリダイレクト
          router.replace('/day')
        } else {
          // 未認証の場合はAuthMobileを表示
          setShowAuth(true)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        // エラー時もAuthMobileを表示
        setShowAuth(true)
      }
    }

    checkAuth()

    // 認証状態の変更を監視
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        router.replace('/day')
      } else if (event === 'SIGNED_OUT') {
        setShowAuth(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  // AuthMobileが読み込まれるまでは何も表示しない（フラッシュを防ぐ）
  if (!showAuth) {
    return null
  }
  
  return <AuthMobile />
}
