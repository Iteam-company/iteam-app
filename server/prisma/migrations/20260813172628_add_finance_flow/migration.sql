-- CreateEnum
CREATE TYPE "FinanceSheetKind" AS ENUM ('TEMPLATE', 'MONTH');

-- CreateEnum
CREATE TYPE "FinanceNodeKind" AS ENUM ('DESTINATION', 'INCOME', 'NOTE');

-- CreateEnum
CREATE TYPE "FinanceDestinationType" AS ENUM ('PAYPAL', 'PAYONEER', 'BANK_FOP', 'OTHER');

-- CreateEnum
CREATE TYPE "FinanceIncomeStatus" AS ENUM ('NOT_TRANSFERRED', 'PENDING', 'TRANSFERRED');

-- CreateTable
CREATE TABLE "FinanceSheet" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "kind" "FinanceSheetKind" NOT NULL DEFAULT 'MONTH',
    "year" INTEGER,
    "month" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceNode" (
    "id" SERIAL NOT NULL,
    "sheetId" INTEGER NOT NULL,
    "kind" "FinanceNodeKind" NOT NULL,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "destinationType" "FinanceDestinationType",
    "label" TEXT,
    "projectId" INTEGER,
    "amount" DECIMAL(12,2),
    "currency" VARCHAR(3),
    "dateFrom" DATE,
    "dateTo" DATE,
    "status" "FinanceIncomeStatus",
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceEdge" (
    "id" SERIAL NOT NULL,
    "sheetId" INTEGER NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "targetId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceSheet_companyId_idx" ON "FinanceSheet"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceSheet_companyId_year_month_key" ON "FinanceSheet"("companyId", "year", "month");

-- CreateIndex
CREATE INDEX "FinanceNode_sheetId_idx" ON "FinanceNode"("sheetId");

-- CreateIndex
CREATE INDEX "FinanceNode_projectId_idx" ON "FinanceNode"("projectId");

-- CreateIndex
CREATE INDEX "FinanceEdge_sheetId_idx" ON "FinanceEdge"("sheetId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceEdge_sourceId_targetId_key" ON "FinanceEdge"("sourceId", "targetId");

-- AddForeignKey
ALTER TABLE "FinanceSheet" ADD CONSTRAINT "FinanceSheet_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceNode" ADD CONSTRAINT "FinanceNode_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "FinanceSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceNode" ADD CONSTRAINT "FinanceNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEdge" ADD CONSTRAINT "FinanceEdge_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "FinanceSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEdge" ADD CONSTRAINT "FinanceEdge_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "FinanceNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEdge" ADD CONSTRAINT "FinanceEdge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "FinanceNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
