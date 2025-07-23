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
    // 即座にローカルストレージをチェック
    const storedSession = localStorage.getItem('sb-pzwxrocchxqmdqeduwjy-auth-token')
    
    if (storedSession) {
      // セッションがある場合は即座にリダイレクト
      router.replace('/day')
      return
    }
    
    // セッションがない場合のみSupabaseチェック
    const supabase = createClient()
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace('/day')
      } else {
        // 認証なしの場合のみAuthMobileを表示
        setShowAuth(true)
      }
    }).catch(() => {
      // エラー時もAuthMobileを表示
      setShowAuth(true)
    })

    // 認証状態の変更を監視（SIGNED_INイベントのみ）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        router.replace('/day')
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
