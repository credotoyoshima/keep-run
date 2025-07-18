-- AlterTable
ALTER TABLE "ActiveTask" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ActiveTimeBlock" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false;
