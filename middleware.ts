import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // ルートページは認証チェックをスキップ（クライアントで処理）
  if (request.nextUrl.pathname === '/') {
    return NextResponse.next()
  }

  // 静的ファイルと認証不要ルートはスキップ
  const publicRoutes = ['/auth/login', '/auth/error', '/auth/reset-password', '/auth/update-password', '/auth/callback']
  if (publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // 保護されたルートのみ認証チェックを実行
  const protectedRoutes = ['/day', '/todo', '/routines', '/analytics', '/settings']
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // より高速なgetSession（キャッシュ活用）
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.log('Middleware auth error:', error)
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 保護されたルートで未認証の場合のみリダイレクト
    if (!session && isProtectedRoute) {
      console.log('Redirecting unauthenticated user to home')
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 認証済みユーザーの情報をヘッダーに追加（API側で再認証を回避）
    if (session?.user) {
      response.headers.set('x-user-id', session.user.id)
      response.headers.set('x-user-email', session.user.email || '')
    }

  } catch (error) {
    console.log('Middleware error:', error)
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ],
}