# Keep Run - セットアップガイド

## Supabaseプロジェクトの設定

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com) にアクセスしてアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクト名: `keep-run`
4. データベースパスワードを設定（安全な場所に保存）
5. リージョンを選択（東京リージョン推奨）

### 2. 環境変数の設定

プロジェクト作成後、以下の情報を取得して `.env.local` に設定します：

1. **Project URL と Anon Key**:
   - Supabaseダッシュボード → Settings → API
   - `Project URL` をコピー → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` キーをコピー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Database URL**:
   - Supabaseダッシュボード → Settings → Database
   - Connection string → URI をコピー
   - `[YOUR-PASSWORD]` を実際のパスワードに置き換え
   - この値を `DATABASE_URL` と `DIRECT_URL` の両方に設定

### 3. .env.local ファイルの作成

```bash
cp .env.local.example .env.local
```

エディタで `.env.local` を開き、取得した値を設定します。

### 4. データベースのマイグレーション

```bash
# Prismaクライアントの生成
npx prisma generate

# データベースのマイグレーション
npx prisma migrate dev --name init
```

### 5. Supabaseの認証設定

1. Supabaseダッシュボード → Authentication → Providers
2. Email認証を有効化
3. 必要に応じてGoogle、GitHubなどのOAuth認証を設定

### 6. Row Level Security (RLS) の設定

Supabaseダッシュボード → SQL Editor で以下を実行：

```sql
-- Enable RLS for all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DayTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TemplateTimeBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TemplateTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActiveDay" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActiveTimeBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActiveTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Todo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContinuousHabit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HabitRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HabitHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyEvaluation" ENABLE ROW LEVEL SECURITY;

-- Create policies (例: Userテーブル)
CREATE POLICY "Users can view own profile" ON "User"
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON "User"
  FOR UPDATE USING (auth.uid()::text = id);
```

## 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションにアクセスできます。