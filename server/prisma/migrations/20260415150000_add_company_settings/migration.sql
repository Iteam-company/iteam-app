-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpFromEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_companyId_key" ON "CompanySettings"("companyId");

-- AddForeignKey
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Company" DROP COLUMN IF EXISTS "smtpHost",
DROP COLUMN IF EXISTS "smtpPort",
DROP COLUMN IF EXISTS "smtpUser",
DROP COLUMN IF EXISTS "smtpPassword",
DROP COLUMN IF EXISTS "smtpFromEmail";
