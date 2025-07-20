# データベース同期チェックリスト

## 問題の調査手順

### 1. デバッグログの確認
アプリケーションを実行して、以下の操作を行ってください：
1. ブラウザの開発者ツールでコンソールを開く
2. 「テスト習慣」の達成ボタンを押す
3. コンソールに表示されるデバッグログを確認

期待されるログ：
- `[DEBUG] toggleHabitCompletion called:` - habitIdが表示されているか
- `[DEBUG] Recording habit mutation called with:` - habitIdが正しく渡されているか
- `[DEBUG] Record habit response:` - レスポンスにhabitIdが含まれているか

サーバー側のログ（ターミナル）：
- `[DEBUG] Recording habit:` - habitIdが受信されているか
- `[DEBUG] Created new record:` - 作成されたレコードにhabitIdが含まれているか

### 2. デバッグAPIの実行
ブラウザで以下のURLにアクセス：
```
http://localhost:3000/api/debug/habit-records
```

このAPIは以下の情報を返します：
- あなたの習慣一覧とそれぞれのレコード
- habitIdがNULLのレコード数
- 統計情報

### 3. データベースの直接確認
Supabaseダッシュボードまたはデータベースクライアントで、以下のSQLを実行：

```sql
-- ユーザーIDを置き換えて実行
SELECT 
    hr.*,
    ch.title as habit_title
FROM "HabitRecord" hr
LEFT JOIN "ContinuousHabit" ch ON hr."habitId" = ch.id
WHERE ch."userId" = 'YOUR_USER_ID'
ORDER BY hr."createdAt" DESC;
```

### 4. Prismaのマイグレーション状態を確認
```bash
npx prisma migrate status
```

### 5. 考えられる原因

1. **Prismaスキーマとデータベースの不一致**
   - マイグレーションが適用されていない
   - カラム名の大文字小文字の問題

2. **データ型の不一致**
   - habitIdの型が一致していない（string vs uuid）

3. **トランザクションの問題**
   - レコード作成時にエラーが発生している

4. **権限の問題**
   - データベースの権限設定

### 6. 修正方法

問題が特定できたら、以下の修正を試してください：

1. **マイグレーションのリセット（開発環境のみ）**
   ```bash
   npx prisma migrate reset
   ```

2. **スキーマの同期**
   ```bash
   npx prisma db push
   ```

3. **Prismaクライアントの再生成**
   ```bash
   npx prisma generate
   ```

### 7. 一時的な対処法

もし問題が解決しない場合は、以下の一時的な対処法を検討してください：

1. 既存のレコードのhabitIdを手動で更新
2. APIエンドポイントでの追加のバリデーション
3. フロントエンドでのリトライロジックの実装

## 注意事項

- デバッグ用のエンドポイント（`/api/debug/habit-records`）は本番環境では削除してください
- デバッグログも本番環境では削除してください