# Keep Run 初回アクセス パフォーマンス最適化案

## 問題の概要
初回アクセス時に5秒程度の遅延が発生している。主な原因は認証チェックの重複とJavaScriptバンドルサイズ。

## 最適化案

### 1. 即時実装可能な改善

#### A. ホームページの最適化
```typescript
// app/page.tsx の改善案
export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // ローカルストレージチェックのみで即座にリダイレクト
    const storedSession = localStorage.getItem('sb-pzwxrocchxqmdqeduwjy-auth-token')
    if (storedSession) {
      router.replace('/day')
      return
    }
    
    // セッションがない場合のみSupabaseチェック
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace('/day')
      } else {
        setIsAuthenticated(false)
      }
    })
  }, [supabase, router])

  // ローディング画面を削除し、即座にAuthMobileを表示
  if (isAuthenticated === false) {
    return <AuthMobile />
  }

  // 最小限のローディング表示
  return null
}
```

#### B. Middlewareの最適化
```typescript
// middleware.ts の改善案
export async function middleware(request: NextRequest) {
  // ルートページは完全にスキップ
  if (request.nextUrl.pathname === '/') {
    return NextResponse.next()
  }

  // キャッシュチェックを最初に実行
  const sessionToken = request.cookies.get('sb-pzwxrocchxqmdqeduwjy-auth-token')?.value
  if (sessionToken && authCache.has(sessionToken)) {
    const cached = authCache.get(sessionToken)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.authenticated 
        ? NextResponse.next() 
        : NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 以降の処理...
}
```

### 2. バンドルサイズの削減

#### A. 動的インポートの活用
```typescript
// 重いコンポーネントを遅延ロード
const AuthMobile = dynamic(() => import('@/components/auth/AuthMobile'), {
  ssr: false,
  loading: () => null
})
```

#### B. ライブラリの最適化
- Radix UIコンポーネントの個別インポート
- Lucide Reactアイコンの必要なものだけインポート
- Prisma Clientのツリーシェイキング設定

### 3. Supabase接続の最適化

#### A. 接続プールの実装
```typescript
// lib/supabase/client.ts
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!clientInstance) {
    clientInstance = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false // 初回のURL解析をスキップ
        }
      }
    )
  }
  return clientInstance
}
```

### 4. プリレンダリング戦略

#### A. 静的生成の活用
```typescript
// app/page.tsx を静的に
export const dynamic = 'force-static'
```

#### B. Edge Runtimeの検討
```typescript
export const runtime = 'edge' // Vercel Edge Functionsを使用
```

### 5. Service Workerの有効化
- オフラインファーストアプローチ
- 静的アセットのプリキャッシュ
- APIレスポンスのキャッシュ

## 実装優先順位

1. **高優先度（即効性あり）**
   - ホームページの最適化（ローディング削除）
   - Middlewareのルートページスキップ
   - Supabase接続オプションの調整

2. **中優先度（効果大）**
   - 動的インポートの実装
   - バンドルサイズの削減
   - Service Worker有効化

3. **低優先度（長期的改善）**
   - Edge Runtime移行
   - CDN最適化
   - リージョン最適化

## 期待される改善効果
- 初回アクセス: 5秒 → 1-2秒
- 2回目以降: 即座に表示（キャッシュ利用）
- バンドルサイズ: 153KB → 100KB以下