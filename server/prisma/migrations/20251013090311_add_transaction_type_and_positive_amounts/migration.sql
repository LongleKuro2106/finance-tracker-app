/*
  Warnings:

  - Added the required column `Type` to the `Transactions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('expense', 'income');

-- AlterTable
ALTER TABLE "Transactions" ADD COLUMN     "Type" "TransactionType" NOT NULL;
