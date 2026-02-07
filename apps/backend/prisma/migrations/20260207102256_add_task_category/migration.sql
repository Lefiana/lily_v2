-- CreateTaskCategoryEnum
CREATE TYPE "TaskCategory" AS ENUM ('TASK', 'ITEM', 'LOG', 'ARCHIVE');

-- AddCategoryToTask
ALTER TABLE "Task" ADD COLUMN "category" "TaskCategory" NOT NULL DEFAULT 'TASK';

-- CreateIndex
CREATE INDEX "Task_category_idx" ON "Task"("category");
