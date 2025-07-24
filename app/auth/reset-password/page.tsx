'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?type=recovery`,
    })

    if (error) {
      setError('パスワードリセットメールの送信に失敗しました。メールアドレスを確認してください。')
      setLoading(false)
      return
    }

    setSuccess('パスワードリセットメールを送信しました。メールをご確認ください。')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center max-w-md mx-auto">
      <div className="w-full p-8">
        <div className="w-full space-y-6">
          {/* Back to Login Link */}
          <Link 
            href="/auth/login"
            className="inline-flex items-center text-sm text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            ログインに戻る
          </Link>

          {/* Title */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-light">パスワードをリセット</h2>
            <p className="text-gray-600 text-sm">
              登録したメールアドレスにパスワードリセットリンクを送信します
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleResetPassword} className="space-y-4">
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
              disabled={loading || success !== null}
            >
              {loading ? '送信中...' : 'リセットメールを送信'}
            </Button>
          </form>

          {/* Additional Info */}
          <div className="text-center text-sm text-gray-600 space-y-2">
            <p>メールが届かない場合は、迷惑メールフォルダをご確認ください。</p>
          </div>
        </div>
      </div>
    </div>
  )
}