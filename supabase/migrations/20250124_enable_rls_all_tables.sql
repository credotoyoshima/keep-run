-- Enable RLS for all tables and create appropriate policies

-- 1. User table (users should only see their own data)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON "User"
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON "User"
    FOR UPDATE
    USING (auth.uid() = id);

-- 2. ActiveDay table
ALTER TABLE "ActiveDay" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own active days" ON "ActiveDay"
    FOR SELECT
    USING (auth.uid() = "userId");

CREATE POLICY "Users can insert own active days" ON "ActiveDay"
    FOR INSERT
    WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own active days" ON "ActiveDay"
    FOR UPDATE
    USING (auth.uid() = "userId");

CREATE POLICY "Users can delete own active days" ON "ActiveDay"
    FOR DELETE
    USING (auth.uid() = "userId");

-- 3. ActiveTimeBlock table
ALTER TABLE "ActiveTimeBlock" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time blocks" ON "ActiveTimeBlock"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "ActiveDay" 
            WHERE "ActiveDay"."id" = "ActiveTimeBlock"."dayId" 
            AND "ActiveDay"."userId" = auth.uid()
        )
    );

CREATE POLICY "Users can insert own time blocks" ON "ActiveTimeBlock"
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "ActiveDay" 
            WHERE "ActiveDay"."id" = "ActiveTimeBlock"."dayId" 
            AND "ActiveDay"."userId" = auth.uid()
        )
    );

CREATE POLICY "Users can update own time blocks" ON "ActiveTimeBlock"
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM "ActiveDay" 
            WHERE "ActiveDay"."id" = "ActiveTimeBlock"."dayId" 
            AND "ActiveDay"."userId" = auth.uid()
        )
    );

CREATE POLICY "Users can delete own time blocks" ON "ActiveTimeBlock"
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM "ActiveDay" 
            WHERE "ActiveDay"."id" = "ActiveTimeBlock"."dayId" 
            AND "ActiveDay"."userId" = auth.uid()
        )
    );

-- 4. ActiveTask table
ALTER TABLE "ActiveTask" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON "ActiveTask"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "ActiveTimeBlock" 
            JOIN "ActiveDay" ON "ActiveDay"."id" = "ActiveTimeBlock"."dayId"
            WHERE "ActiveTimeBlock"."id" = "ActiveTask"."blockId" 
            AND "ActiveDay"."userId" = auth.uid()
        )
    );

CREATE POLICY "Users can insert own tasks" ON "ActiveTask"
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "ActiveTimeBlock" 
            JOIN "ActiveDay" ON "ActiveDay"."id" = "ActiveTimeBlock"."dayId"
            WHERE "ActiveTimeBlock"."id" = "ActiveTask"."blockId" 
            AND "ActiveDay"."userId" = auth.uid()
        )
    );

CREATE POLICY "Users can update own tasks" ON "ActiveTask"
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM "ActiveTimeBlock" 
            JOIN "ActiveDay" ON "ActiveDay"."id" = "ActiveTimeBlock"."dayId"
            WHERE "ActiveTimeBlock"."id" = "ActiveTask"."blockId" 
            AND "ActiveDay"."userId" = auth.uid()
        )
    );

CREATE POLICY "Users can delete own tasks" ON "ActiveTask"
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM "ActiveTimeBlock" 
            JOIN "ActiveDay" ON "ActiveDay"."id" = "ActiveTimeBlock"."dayId"
            WHERE "ActiveTimeBlock"."id" = "ActiveTask"."blockId" 
            AND "ActiveDay"."userId" = auth.uid()
        )
    );

-- 5. Todo table
ALTER TABLE "Todo" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own todos" ON "Todo"
    FOR SELECT
    USING (auth.uid() = "userId");

CREATE POLICY "Users can insert own todos" ON "Todo"
    FOR INSERT
    WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own todos" ON "Todo"
    FOR UPDATE
    USING (auth.uid() = "userId");

CREATE POLICY "Users can delete own todos" ON "Todo"
    FOR DELETE
    USING (auth.uid() = "userId");

-- 6. ContinuousHabit table
ALTER TABLE "ContinuousHabit" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habits" ON "ContinuousHabit"
    FOR SELECT
    USING (auth.uid() = "userId");

CREATE POLICY "Users can insert own habits" ON "ContinuousHabit"
    FOR INSERT
    WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own habits" ON "ContinuousHabit"
    FOR UPDATE
    USING (auth.uid() = "userId");

CREATE POLICY "Users can delete own habits" ON "ContinuousHabit"
    FOR DELETE
    USING (auth.uid() = "userId");

-- 7. HabitRecord table
ALTER TABLE "HabitRecord" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habit records" ON "HabitRecord"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "ContinuousHabit" 
            WHERE "ContinuousHabit"."id" = "HabitRecord"."habitId" 
            AND "ContinuousHabit"."userId" = auth.uid()
        )
    );

CREATE POLICY "Users can insert own habit records" ON "HabitRecord"
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "ContinuousHabit" 
            WHERE "ContinuousHabit"."id" = "HabitRecord"."habitId" 
            AND "ContinuousHabit"."userId" = auth.uid()
        )
    );

CREATE POLICY "Users can update own habit records" ON "HabitRecord"
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM "ContinuousHabit" 
            WHERE "ContinuousHabit"."id" = "HabitRecord"."habitId" 
            AND "ContinuousHabit"."userId" = auth.uid()
        )
    );

CREATE POLICY "Users can delete own habit records" ON "HabitRecord"
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM "ContinuousHabit" 
            WHERE "ContinuousHabit"."id" = "HabitRecord"."habitId" 
            AND "ContinuousHabit"."userId" = auth.uid()
        )
    );

-- 8. HabitHistory table
ALTER TABLE "HabitHistory" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habit history" ON "HabitHistory"
    FOR SELECT
    USING (auth.uid() = "userId");

CREATE POLICY "Users can insert own habit history" ON "HabitHistory"
    FOR INSERT
    WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own habit history" ON "HabitHistory"
    FOR UPDATE
    USING (auth.uid() = "userId");

CREATE POLICY "Users can delete own habit history" ON "HabitHistory"
    FOR DELETE
    USING (auth.uid() = "userId");

-- 9. DailyEvaluation table
ALTER TABLE "DailyEvaluation" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evaluations" ON "DailyEvaluation"
    FOR SELECT
    USING (auth.uid() = "userId");

CREATE POLICY "Users can insert own evaluations" ON "DailyEvaluation"
    FOR INSERT
    WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own evaluations" ON "DailyEvaluation"
    FOR UPDATE
    USING (auth.uid() = "userId");

CREATE POLICY "Users can delete own evaluations" ON "DailyEvaluation"
    FOR DELETE
    USING (auth.uid() = "userId");