import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createClient()
    
    // Supabaseのマジックリンクを検証
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })

    if (!error) {
      // パスワードリセットの場合は、update-passwordページにリダイレクト
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/auth/update-password', request.url))
      }
      
      // サインアップ確認の場合
      if (type === 'signup' || type === 'email') {
        // ログインページにリダイレクトして成功メッセージを表示
        return NextResponse.redirect(new URL('/auth/login?confirmed=true', request.url))
      }
      
      // その他の確認タイプの場合は、指定されたページまたはホームにリダイレクト
      return NextResponse.redirect(new URL(next, request.url))
    }

    // エラーがある場合
    console.error('Error confirming auth link:', error)
    return NextResponse.redirect(
      new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, request.url)
    )
  }

  // 必要なパラメータがない場合
  return NextResponse.redirect(
    new URL('/auth/error?error=認証リンクが無効です', request.url)
  )
}