-- デバッグ用SQLクエリ
-- HabitRecordテーブルの内容を確認

-- 1. すべてのHabitRecordを確認
SELECT 
    hr.id,
    hr."habitId",
    hr.date,
    hr.completed,
    hr."createdAt",
    ch.title as habit_title,
    ch."userId"
FROM "HabitRecord" hr
LEFT JOIN "ContinuousHabit" ch ON hr."habitId" = ch.id
ORDER BY hr."createdAt" DESC
LIMIT 20;

-- 2. habitIdがNULLのレコードを確認
SELECT COUNT(*) as null_habit_count
FROM "HabitRecord"
WHERE "habitId" IS NULL;

-- 3. 特定のユーザーの習慣と記録を確認（ユーザーIDを置き換えてください）
-- SELECT 
--     ch.id as habit_id,
--     ch.title,
--     ch."isActive",
--     COUNT(hr.id) as record_count,
--     COUNT(CASE WHEN hr."habitId" IS NULL THEN 1 END) as null_habit_records
-- FROM "ContinuousHabit" ch
-- LEFT JOIN "HabitRecord" hr ON ch.id = hr."habitId"
-- WHERE ch."userId" = 'YOUR_USER_ID_HERE'
-- GROUP BY ch.id, ch.title, ch."isActive";