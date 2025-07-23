'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AuthMobile() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const translateAuthError = (error: string): string => {
    const errorMessages: { [key: string]: string } = {
      'Invalid email': 'メールアドレスの形式が正しくありません',
      'Password should be at least 6 characters': 'パスワードは6文字以上で入力してください',
      'Password should be at least 8 characters': 'パスワードは8文字以上で入力してください',
      'User already registered': 'このメールアドレスは既に登録されています',
      'Email not confirmed': 'メールアドレスが確認されていません',
      'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません',
      'Too many requests': 'リクエストが多すぎます。しばらく時間をおいてから再試行してください',
      'Signup requires a valid password': '有効なパスワードを入力してください',
      'Unable to validate email address: invalid format': 'メールアドレスの形式が正しくありません',
      'Password should be at least 6 characters.': 'パスワードは6文字以上で入力してください',
      'User not found': 'ユーザーが見つかりません'
    }
    
    // 部分一致でのマッピング
    for (const [englishMsg, japaneseMsg] of Object.entries(errorMessages)) {
      if (error.toLowerCase().includes(englishMsg.toLowerCase())) {
        return japaneseMsg
      }
    }
    
    return error // デフォルトは元のメッセージ
  }

  const handleSignUp = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: nickname,
        },
      },
    })

    if (authError) {
      setError(translateAuthError(authError.message))
      setLoading(false)
      return
    }

    if (authData.user) {
      const { error: userError } = await supabase
        .from('User')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          name: nickname || null,
          updatedAt: new Date().toISOString(),
        })

      if (userError) {
        setError('ユーザー情報の保存に失敗しました')
        setLoading(false)
        return
      }

      // メール確認が必要な場合
      if (!authData.session) {
        setSuccess('アカウントが作成されました！確認メールをお送りしましたので、メール内のリンクをクリックしてアカウントを有効化してください。')
        setLoading(false)
        return
      }

      // 即座にログインできる場合
      setSuccess('アカウントが作成されました！')
      setTimeout(() => {
        router.push('/day')
      }, 1500)
    }

    setLoading(false)
  }

  const handleSignIn = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(translateAuthError(error.message))
      setLoading(false)
      return
    }

    // ログイン成功後は直接/dayへリダイレクト
    setSuccess('ログインしました！')
    setTimeout(() => {
      router.push('/day')
    }, 500)
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      setError(translateAuthError(error.message))
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSignUp) {
      await handleSignUp()
    } else {
      await handleSignIn()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center max-w-md mx-auto relative">
      <div className="w-full p-8">
        <div className="w-full space-y-6">
          {/* App Title */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extralight tracking-tight">Keep Run</h2>
            <p className="text-gray-600 font-light text-sm">
              継続的な成長のためのタスク管理ツール
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ニックネーム
                </label>
                <Input
                  type="text"
                  placeholder="タロウ"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full"
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <Input
                type="password"
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                required
              />
              {isSignUp && (
                <p className="text-xs text-gray-500 mt-1">
                  8文字以上で入力してください
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-black hover:bg-gray-800 text-white py-3"
              disabled={loading}
            >
              {loading 
                ? (isSignUp ? '作成中...' : 'ログイン中...') 
                : (isSignUp ? 'アカウント作成' : 'ログイン')
              }
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">または</span>
            </div>
          </div>

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            className="w-full py-3 border-gray-300"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Googleでログイン
          </Button>

          {/* Toggle Mode */}
          <div className="text-center space-y-3">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
                setSuccess(null)
                setEmail('')
                setPassword('')
                setNickname('')
              }}
              className="text-sm text-gray-600 hover:text-black transition-colors"
            >
              {isSignUp 
                ? 'すでにアカウントをお持ちですか？ ログイン' 
                : 'アカウントをお持ちでない方は こちら'
              }
            </button>
            
            {/* Password Reset Link - Only show on login mode */}
            {!isSignUp && (
              <div>
                <button
                  type="button"
                  onClick={() => window.location.href = '/auth/reset-password'}
                  className="text-sm text-gray-600 hover:text-black transition-colors"
                >
                  パスワードをお忘れの方は こちら
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}