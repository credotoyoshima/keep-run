-- CreateTable
CREATE TABLE "TodoRoutineCompletion" (
    "id" TEXT NOT NULL,
    "todoId" TEXT NOT NULL,
    "completedDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodoRoutineCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TodoRoutineCompletion_todoId_completedDate_key" ON "TodoRoutineCompletion"("todoId", "completedDate");

-- AddForeignKey
ALTER TABLE "TodoRoutineCompletion" ADD CONSTRAINT "TodoRoutineCompletion_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "Todo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
