-- Enable Row Level Security for TodoRoutineCompletion table
ALTER TABLE "TodoRoutineCompletion" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view only their own routine completions
CREATE POLICY "Users can view own routine completions" ON "TodoRoutineCompletion"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM "Todo" 
      WHERE "Todo"."id" = "TodoRoutineCompletion"."todoId" 
      AND "Todo"."userId" = auth.uid()
    )
  );

-- Create policy to allow users to insert their own routine completions
CREATE POLICY "Users can insert own routine completions" ON "TodoRoutineCompletion"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM "Todo" 
      WHERE "Todo"."id" = "TodoRoutineCompletion"."todoId" 
      AND "Todo"."userId" = auth.uid()
    )
  );

-- Create policy to allow users to update their own routine completions
CREATE POLICY "Users can update own routine completions" ON "TodoRoutineCompletion"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM "Todo" 
      WHERE "Todo"."id" = "TodoRoutineCompletion"."todoId" 
      AND "Todo"."userId" = auth.uid()
    )
  );

-- Create policy to allow users to delete their own routine completions
CREATE POLICY "Users can delete own routine completions" ON "TodoRoutineCompletion"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM "Todo" 
      WHERE "Todo"."id" = "TodoRoutineCompletion"."todoId" 
      AND "Todo"."userId" = auth.uid()
    )
  );