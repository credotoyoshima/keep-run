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
        
        // URLのハッシュフラグメントをチェック（パスワードリセットなど）
        console.log('Current URL:', window.location.href)
        console.log('Hash:', window.location.hash)
        
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const type = hashParams.get('type')
        
        console.log('Hash params:', {
          accessToken: accessToken ? 'present' : 'missing',
          type,
          allParams: Array.from(hashParams.entries())
        })
        
        // パスワードリセットトークンが含まれている場合
        if (accessToken && type === 'recovery') {
          console.log('Recovery token detected, setting session...')
          
          // トークンを使ってセッションを設定
          const refreshToken = hashParams.get('refresh_token')
          
          try {
            if (refreshToken) {
              // refresh_tokenがある場合はsetSessionを使用
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              })
              
              if (!error) {
                console.log('Session set successfully, redirecting to update-password...')
                // 成功したらパスワード更新ページへリダイレクト
                // ハッシュフラグメントも含めてリダイレクト
                window.location.href = '/auth/update-password'
                return
              } else {
                console.error('Error setting session from recovery token:', error)
              }
            } else {
              // refresh_tokenがない場合は直接verifyOtpを試す
              console.log('No refresh token, trying verifyOtp...')
              const { error } = await supabase.auth.verifyOtp({
                token_hash: accessToken,
                type: 'recovery'
              })
              
              if (!error) {
                console.log('OTP verified successfully, redirecting to update-password...')
                window.location.href = '/auth/update-password'
                return
              } else {
                console.error('Error verifying OTP:', error)
              }
            }
          } catch (err) {
            console.error('Unexpected error handling recovery token:', err)
          }
        }
        
        // エラーパラメータのチェック
        const urlParams = new URLSearchParams(window.location.search)
        const errorParam = urlParams.get('error')
        const errorDescription = urlParams.get('error_description')
        
        if (errorParam) {
          console.error('Auth error:', errorParam, errorDescription)
          // エラーがある場合もAuthMobileを表示
          setShowAuth(true)
          return
        }
        
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
