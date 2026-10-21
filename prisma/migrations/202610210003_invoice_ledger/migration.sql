-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "sourceInvoiceId" TEXT;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_agencyId_sourceInvoiceId_fkey" FOREIGN KEY ("agencyId", "sourceInvoiceId") REFERENCES "Invoice"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

