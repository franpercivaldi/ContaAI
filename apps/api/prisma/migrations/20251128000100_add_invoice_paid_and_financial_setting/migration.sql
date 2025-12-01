-- Add `paid` column to Invoice
ALTER TABLE "Invoice" ADD COLUMN "paid" boolean NOT NULL DEFAULT false;

