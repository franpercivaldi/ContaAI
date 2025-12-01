-- Add `paid` column to Invoice
ALTER TABLE "Invoice" ADD COLUMN "paid" boolean NOT NULL DEFAULT false;


-- Add Organization enum and column
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Organization') THEN
		CREATE TYPE "Organization" AS ENUM ('OBRA_SOCIAL','AOITA','MUTUAL','DESCONOCIDA');
	END IF;
END$$;

ALTER TABLE "Invoice" ADD COLUMN "organization" "Organization" NOT NULL DEFAULT 'DESCONOCIDA';

