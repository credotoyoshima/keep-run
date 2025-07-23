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
        
        // まずセッションの存在確認（高速）
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          // セッションがない場合は即座にAuthMobileを表示
          setShowAuth(true)
          return
        }
        
        // セッションがある場合は即座にリダイレクト
        // バックグラウンドで検証は行うが、UIはブロックしない
        router.replace('/day')
        
        // 非同期でセッションの有効性を確認（UIをブロックしない）
        supabase.auth.getUser().then(({ data: { user }, error }) => {
          if (error || !user) {
            // 無効なセッションの場合はホームに戻す
            router.replace('/')
          }
        })
        
      } catch (error) {
        console.error('Auth check error:', error)
        // エラー時もAuthMobileを表示
        setShowAuth(true)
      }
    }

    checkAuth()

    // 認証状態の変更を監視
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // サインイン後は即座にリダイレクト
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
