/*
  Warnings:

  - The values [TASK_ASSIGNED,TASK_UNASSIGNED,TASK_STATUS_CHANGED,TASK_UPDATED] on the enum `NotifType` will be removed. If these variants are still used in the database, this will fail.
  - The values [WORKING,WEEKEND,SICK_LEAVE] on the enum `WorkDayStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `taskId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `workingOnTaskId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `WorkDay` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `WorkDay` table. All the data in the column will be lost.
  - You are about to drop the `Board` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskAssignee` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotifType_new" AS ENUM ('ONBOARDING_START', 'ONBOARDING_END', 'PASSWORD_RESET', 'JOB_ASSIGNED');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotifType_new" USING ("type"::text::"NotifType_new");
ALTER TYPE "NotifType" RENAME TO "NotifType_old";
ALTER TYPE "NotifType_new" RENAME TO "NotifType";
DROP TYPE "public"."NotifType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "WorkDayStatus_new" AS ENUM ('WEEKEND_PAID', 'WEEKEND_UNPAID', 'SICK_LEAVE_UNPAID', 'SICK_LEAVE_PAID', 'VACATION', 'HOLIDAY');
ALTER TABLE "public"."WorkDay" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WorkDay" ALTER COLUMN "status" TYPE "WorkDayStatus_new" USING ("status"::text::"WorkDayStatus_new");
ALTER TYPE "WorkDayStatus" RENAME TO "WorkDayStatus_old";
ALTER TYPE "WorkDayStatus_new" RENAME TO "WorkDayStatus";
DROP TYPE "public"."WorkDayStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Board" DROP CONSTRAINT "Board_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Board" DROP CONSTRAINT "Board_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_taskId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_boardId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_createdById_fkey";

-- DropForeignKey
ALTER TABLE "TaskAssignee" DROP CONSTRAINT "TaskAssignee_taskId_fkey";

-- DropForeignKey
ALTER TABLE "TaskAssignee" DROP CONSTRAINT "TaskAssignee_userId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_workingOnTaskId_fkey";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "taskId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "workingOnTaskId";

-- AlterTable
ALTER TABLE "WorkDay" DROP COLUMN "endTime",
DROP COLUMN "startTime",
ALTER COLUMN "status" DROP DEFAULT;

-- DropTable
DROP TABLE "Board";

-- DropTable
DROP TABLE "Task";

-- DropTable
DROP TABLE "TaskAssignee";

-- DropEnum
DROP TYPE "BoardType";

-- DropEnum
DROP TYPE "TaskEstimate";

-- DropEnum
DROP TYPE "TaskPriority";

-- DropEnum
DROP TYPE "TaskStatus";

-- CreateTable
CREATE TABLE "WorkTimeEntry" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkTimeEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkTimeEntry" ADD CONSTRAINT "WorkTimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
