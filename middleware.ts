import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 認証キャッシュ（メモリキャッシュ）
const authCache = new Map<string, { authenticated: boolean; timestamp: number }>()
const CACHE_TTL = 30 * 1000 // 30秒
const MAX_CACHE_SIZE = 1000 // 最大キャッシュサイズ

// 古いキャッシュエントリをクリーンアップ
function cleanupCache() {
  const now = Date.now()
  for (const [key, value] of authCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      authCache.delete(key)
    }
  }
  // キャッシュサイズが大きすぎる場合は古いものから削除
  if (authCache.size > MAX_CACHE_SIZE) {
    const sortedEntries = Array.from(authCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toDelete = sortedEntries.slice(0, authCache.size - MAX_CACHE_SIZE)
    toDelete.forEach(([key]) => authCache.delete(key))
  }
}

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

  // セッショントークンを取得してキャッシュをチェック
  const sessionToken = request.cookies.get('sb-pzwxrocchxqmdqeduwjy-auth-token')?.value
  
  if (sessionToken) {
    // キャッシュをチェック
    const cached = authCache.get(sessionToken)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (!cached.authenticated) {
        console.log('Cached: User not authenticated, redirecting')
        return NextResponse.redirect(new URL('/', request.url))
      }
      // 認証済みの場合はそのまま続行
      console.log('Cached: User authenticated')
      const response = NextResponse.next()
      // キャッシュからの情報でもヘッダーを設定
      response.headers.set('x-cached-auth', 'true')
      return response
    }
  }

  // 定期的にキャッシュをクリーンアップ
  if (Math.random() < 0.1) { // 10%の確率でクリーンアップ
    cleanupCache()
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
      // キャッシュに保存
      if (sessionToken) {
        authCache.set(sessionToken, { authenticated: false, timestamp: Date.now() })
      }
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 認証済みユーザーの情報をヘッダーに追加（API側で再認証を回避）
    if (session?.user) {
      response.headers.set('x-user-id', session.user.id)
      response.headers.set('x-user-email', session.user.email || '')
      
      // キャッシュに保存
      if (sessionToken) {
        authCache.set(sessionToken, { authenticated: true, timestamp: Date.now() })
      }
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