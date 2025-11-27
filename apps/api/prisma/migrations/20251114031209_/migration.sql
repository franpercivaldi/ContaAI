-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "condicionIva" TEXT,
ADD COLUMN     "montoIva" DECIMAL(18,2),
ADD COLUMN     "razonSocial" TEXT,
ADD COLUMN     "tipoFactura" TEXT;
