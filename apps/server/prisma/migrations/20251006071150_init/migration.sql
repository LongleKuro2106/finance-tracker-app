-- CreateEnum
CREATE TYPE "Role" AS ENUM ('administrator', 'user');

-- CreateTable
CREATE TABLE "Users" (
    "UserID" UUID NOT NULL,
    "Username" VARCHAR(50) NOT NULL,
    "Password" VARCHAR(72) NOT NULL,
    "Email" VARCHAR(100) NOT NULL,
    "Role" "Role" NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("UserID")
);

-- CreateTable
CREATE TABLE "Accounts" (
    "AccountID" SERIAL NOT NULL,
    "UserID" UUID,
    "AccountName" VARCHAR(100) NOT NULL,
    "Balance" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "Accounts_pkey" PRIMARY KEY ("AccountID")
);

-- CreateTable
CREATE TABLE "Transactions" (
    "TransactionID" SERIAL NOT NULL,
    "AccountID" INTEGER NOT NULL,
    "Amount" DECIMAL(15,2) NOT NULL,
    "TransactionDate" TIMESTAMP(3) NOT NULL,
    "Category" VARCHAR(50),
    "Description" TEXT,

    CONSTRAINT "Transactions_pkey" PRIMARY KEY ("TransactionID")
);

-- CreateTable
CREATE TABLE "Categories" (
    "CategoryID" SERIAL NOT NULL,
    "CategoryName" VARCHAR(50) NOT NULL,

    CONSTRAINT "Categories_pkey" PRIMARY KEY ("CategoryID")
);

-- CreateTable
CREATE TABLE "Budgets" (
    "BudgetID" SERIAL NOT NULL,
    "UserID" UUID,
    "CategoryID" INTEGER,
    "Amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "Budgets_pkey" PRIMARY KEY ("BudgetID")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_Username_key" ON "Users"("Username");

-- CreateIndex
CREATE UNIQUE INDEX "Users_Email_key" ON "Users"("Email");

-- AddForeignKey
ALTER TABLE "Accounts" ADD CONSTRAINT "Accounts_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_AccountID_fkey" FOREIGN KEY ("AccountID") REFERENCES "Accounts"("AccountID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budgets" ADD CONSTRAINT "Budgets_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budgets" ADD CONSTRAINT "Budgets_CategoryID_fkey" FOREIGN KEY ("CategoryID") REFERENCES "Categories"("CategoryID") ON DELETE SET NULL ON UPDATE CASCADE;
