-- CreateEnum
CREATE TYPE "BoardType" AS ENUM ('LIST', 'KANBAN', 'SCRUM');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskEstimate" AS ENUM ('S', 'M', 'L', 'XL');

-- CreateEnum
CREATE TYPE "NotifType" AS ENUM ('TASK_ASSIGNED', 'TASK_UNASSIGNED', 'TASK_STATUS_CHANGED', 'TASK_UPDATED');

-- CreateEnum
CREATE TYPE "WorkDayStatus" AS ENUM ('WORKING', 'WEEKEND', 'SICK_LEAVE', 'VACATION');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "salary" DECIMAL(12,2),
ADD COLUMN     "statusNote" TEXT,
ADD COLUMN     "workingOnTaskId" INTEGER;

-- CreateTable
CREATE TABLE "Board" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "type" "BoardType" NOT NULL DEFAULT 'KANBAN',
    "companyId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "estimate" "TaskEstimate",
    "estimateHours" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "boardId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAssignee" (
    "taskId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAssignee_pkey" PRIMARY KEY ("taskId","userId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "NotifType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "taskId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkDay" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "status" "WorkDayStatus" NOT NULL DEFAULT 'WORKING',
    "startTime" TEXT,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkDay_userId_date_key" ON "WorkDay"("userId", "date");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_workingOnTaskId_fkey" FOREIGN KEY ("workingOnTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkDay" ADD CONSTRAINT "WorkDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
