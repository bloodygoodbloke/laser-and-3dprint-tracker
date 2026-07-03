-- Pricing guardrails and invoice-finance completeness fields.
ALTER TABLE "BillingSetting" ADD COLUMN "minimumCharge" REAL NOT NULL DEFAULT 0;
ALTER TABLE "BillingSetting" ADD COLUMN "setupFee" REAL NOT NULL DEFAULT 0;
ALTER TABLE "BillingSetting" ADD COLUMN "rushFeePercent" REAL NOT NULL DEFAULT 0;
ALTER TABLE "BillingSetting" ADD COLUMN "wasteFactorPercent" REAL NOT NULL DEFAULT 0;
ALTER TABLE "BillingSetting" ADD COLUMN "depositPercent" REAL NOT NULL DEFAULT 0;
ALTER TABLE "BillingSetting" ADD COLUMN "paymentTermsDays" INTEGER NOT NULL DEFAULT 0;

-- Quote workflow and payment tracking fields on jobs.
ALTER TABLE "Job" ADD COLUMN "isRush" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'Unpaid';
ALTER TABLE "Job" ADD COLUMN "depositPaidAmount" REAL NOT NULL DEFAULT 0;
