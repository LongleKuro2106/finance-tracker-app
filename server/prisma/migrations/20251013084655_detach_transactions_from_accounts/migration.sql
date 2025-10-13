/*
  Warnings:

  - You are about to drop the column `AccountID` on the `Transactions` table. All the data in the column will be lost.
  - You are about to drop the `Accounts` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `UserID` to the `Transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Accounts" DROP CONSTRAINT "Accounts_UserID_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transactions" DROP CONSTRAINT "Transactions_AccountID_fkey";

-- AlterTable
ALTER TABLE "Transactions" DROP COLUMN "AccountID",
ADD COLUMN     "UserID" UUID NOT NULL;

-- DropTable
DROP TABLE "public"."Accounts";

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;
