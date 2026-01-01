/*
  Warnings:

  - You are about to drop the column `Category` on the `Transactions` table. All the data in the column will be lost.
  - Added the required column `PeriodEnd` to the `Budgets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `PeriodStart` to the `Budgets` table without a default value. This is not possible if the table is not empty.
  - Made the column `UserID` on table `Budgets` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "DefaultCategory" AS ENUM ('groceries', 'transport', 'utilities', 'entertainment', 'shopping', 'healthcare', 'housing', 'salary', 'investment', 'other');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('none', 'weekly', 'monthly', 'yearly');

-- DropForeignKey
ALTER TABLE "public"."Budgets" DROP CONSTRAINT "Budgets_UserID_fkey";

-- AlterTable
ALTER TABLE "Budgets" ADD COLUMN     "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "PeriodEnd" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "PeriodStart" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "Recurrence" "RecurrenceType" NOT NULL DEFAULT 'monthly',
ALTER COLUMN "UserID" SET NOT NULL;

-- AlterTable
ALTER TABLE "Categories" ADD COLUMN     "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "UserID" UUID;

-- AlterTable
ALTER TABLE "Transactions" DROP COLUMN "Category",
ADD COLUMN     "CategoryID" INTEGER,
ADD COLUMN     "DefaultCategory" "DefaultCategory",
ALTER COLUMN "TransactionDate" SET DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_CategoryID_fkey" FOREIGN KEY ("CategoryID") REFERENCES "Categories"("CategoryID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categories" ADD CONSTRAINT "Categories_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budgets" ADD CONSTRAINT "Budgets_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;
