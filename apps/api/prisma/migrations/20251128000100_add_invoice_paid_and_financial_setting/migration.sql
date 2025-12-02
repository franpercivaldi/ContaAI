-- Add `paid` column to Invoice
ALTER TABLE "Invoice" ADD COLUMN "paid" boolean NOT NULL DEFAULT false;


-- Add Organization enum and column
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Organization') THEN
		CREATE TYPE "Organization" AS ENUM ('OBRA_SOCIAL','AOITA','MUTUAL','DESCONOCIDA');
	END IF;
END$$;

ALTER TABLE "Invoice" ADD COLUMN "organization" "Organization" NOT NULL DEFAULT 'DESCONOCIDA';

-- Create OrganizationBudget table if not exists
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'OrganizationBudget') THEN
		CREATE TABLE "OrganizationBudget" (
			"id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
			"organization" "Organization" UNIQUE NOT NULL,
			"initialAmount" numeric(18,2) NOT NULL DEFAULT 0,
			"createdAt" timestamptz NOT NULL DEFAULT now(),
			"updatedAt" timestamptz NOT NULL DEFAULT now()
		);
	END IF;
END$$;

-- Seed some default budgets (no-op if conflict)
INSERT INTO "OrganizationBudget" ("id","organization","initialAmount")
VALUES
	(gen_random_uuid()::text,'OBRA_SOCIAL', 0),
	(gen_random_uuid()::text,'AOITA', 100),
	(gen_random_uuid()::text,'MUTUAL', 0)
ON CONFLICT ("organization") DO NOTHING;

