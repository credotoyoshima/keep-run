import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // エラーがある場合の処理
  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/auth/error?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    )
  }

  if (code) {
    try {
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
      
      const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error('Session exchange error:', sessionError)
        return NextResponse.redirect(
          new URL(`/auth/error?error=${encodeURIComponent(sessionError.message)}`, request.url)
        )
      }
      
      if (session?.user) {
        // ユーザー情報をUserテーブルに保存
        const { data: existingUser } = await supabase
          .from('User')
          .select('id')
          .eq('id', session.user.id)
          .single()

        if (!existingUser) {
          const { error: insertError } = await supabase
            .from('User')
            .insert({
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.user_metadata?.nickname || null,
              updatedAt: new Date().toISOString(),
            })
            
          if (insertError) {
            console.error('User insert error:', insertError)
            // ユーザー作成に失敗してもログインは続行
          }
        }
      }
      
      // ホームページにリダイレクト
      return NextResponse.redirect(new URL('/', request.url))
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(
        new URL('/auth/error?error=予期しないエラーが発生しました', request.url)
      )
    }
  }

  // codeパラメータがない場合
  return NextResponse.redirect(new URL('/auth/error?error=認証コードが見つかりません', request.url))
}