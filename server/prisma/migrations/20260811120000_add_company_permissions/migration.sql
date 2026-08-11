-- CreateEnum
CREATE TYPE "CompanyPermission" AS ENUM ('ADMIN', 'MANAGE_COMPANY', 'MANAGE_SETTINGS', 'MANAGE_ROLES', 'MANAGE_MEMBERS', 'MANAGE_SALARY', 'INVITE_MEMBERS', 'SEND_MESSAGES');

-- AlterTable
ALTER TABLE "CompanyRole" ADD COLUMN "permissions" "CompanyPermission"[] NOT NULL DEFAULT ARRAY[]::"CompanyPermission"[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN "companyRoleId" INTEGER;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role";

-- DropEnum
DROP TYPE "Role";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyRoleId_fkey" FOREIGN KEY ("companyRoleId") REFERENCES "CompanyRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
