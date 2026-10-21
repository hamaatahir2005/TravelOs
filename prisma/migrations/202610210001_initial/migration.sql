-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'AGENCY_MANAGER', 'TICKET_AGENT', 'VISA_OFFICER', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'IQD');

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "logoDocumentId" TEXT,
    "receiptHeader" TEXT NOT NULL DEFAULT 'Thank you for choosing us. Safe travels!',
    "invoicePrefix" TEXT NOT NULL DEFAULT 'TOS',
    "invoiceSequence" INTEGER NOT NULL DEFAULT 1000,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL,
    "nationality" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "passengerName" TEXT NOT NULL,
    "airline" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departureAt" TIMESTAMP(3) NOT NULL,
    "arrivalAt" TIMESTAMP(3) NOT NULL,
    "pnr" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "purchasePrice" DECIMAL(18,2) NOT NULL,
    "sellingPrice" DECIMAL(18,2) NOT NULL,
    "serviceFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "exchangeRate" DECIMAL(18,6) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaApplication" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "visaType" TEXT NOT NULL,
    "passportEncrypted" TEXT NOT NULL,
    "passportExpiry" TIMESTAMP(3) NOT NULL,
    "applicationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submissionDate" TIMESTAMP(3),
    "reminderAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "requiredDocuments" TEXT[],
    "supplierFee" DECIMAL(18,2) NOT NULL,
    "governmentFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL(18,2) NOT NULL,
    "exchangeRate" DECIMAL(18,6) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisaApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaStatusEvent" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "visaId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisaStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "encryptedContent" BYTEA NOT NULL,
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "ticketId" TEXT,
    "visaId" TEXT,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "ticketId" TEXT,
    "visaId" TEXT,
    "number" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "exchangeRate" DECIMAL(18,6) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashAccount" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "customerId" TEXT,
    "supplierId" TEXT,
    "invoiceId" TEXT,
    "cashAccountId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "exchangeRate" DECIMAL(18,6) NOT NULL,
    "direction" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "cashAccountId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "exchangeRate" DECIMAL(18,6) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "ticketId" TEXT,
    "visaId" TEXT,
    "cashAccountId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journal" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "partyId" TEXT,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL,
    "exchangeRate" DECIMAL(18,6) NOT NULL,
    "baseDebit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "baseCredit" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "unitsPerUsd" DECIMAL(18,6) NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_agencyId_id_key" ON "Staff"("agencyId", "id");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Customer_agencyId_name_idx" ON "Customer"("agencyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_agencyId_id_key" ON "Customer"("agencyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_agencyId_id_key" ON "Supplier"("agencyId", "id");

-- CreateIndex
CREATE INDEX "Ticket_agencyId_departureAt_idx" ON "Ticket"("agencyId", "departureAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_agencyId_id_key" ON "Ticket"("agencyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_agencyId_ticketNumber_key" ON "Ticket"("agencyId", "ticketNumber");

-- CreateIndex
CREATE INDEX "VisaApplication_agencyId_status_idx" ON "VisaApplication"("agencyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VisaApplication_agencyId_id_key" ON "VisaApplication"("agencyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "Document_agencyId_id_key" ON "Document"("agencyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_agencyId_id_key" ON "Invoice"("agencyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_agencyId_number_key" ON "Invoice"("agencyId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_agencyId_ticketId_key" ON "Invoice"("agencyId", "ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_agencyId_visaId_key" ON "Invoice"("agencyId", "visaId");

-- CreateIndex
CREATE UNIQUE INDEX "CashAccount_agencyId_id_key" ON "CashAccount"("agencyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CashAccount_agencyId_name_key" ON "CashAccount"("agencyId", "name");

-- CreateIndex
CREATE INDEX "Payment_agencyId_createdAt_idx" ON "Payment"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX "Expense_agencyId_date_idx" ON "Expense"("agencyId", "date");

-- CreateIndex
CREATE INDEX "Refund_agencyId_createdAt_idx" ON "Refund"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX "Journal_agencyId_createdAt_idx" ON "Journal"("agencyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Journal_agencyId_id_key" ON "Journal"("agencyId", "id");

-- CreateIndex
CREATE INDEX "LedgerEntry_agencyId_account_idx" ON "LedgerEntry"("agencyId", "account");

-- CreateIndex
CREATE INDEX "AuditLog_agencyId_createdAt_idx" ON "AuditLog"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX "ExchangeRate_agencyId_currency_effectiveAt_idx" ON "ExchangeRate"("agencyId", "currency", "effectiveAt");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_agencyId_customerId_fkey" FOREIGN KEY ("agencyId", "customerId") REFERENCES "Customer"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_agencyId_supplierId_fkey" FOREIGN KEY ("agencyId", "supplierId") REFERENCES "Supplier"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaApplication" ADD CONSTRAINT "VisaApplication_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaApplication" ADD CONSTRAINT "VisaApplication_agencyId_customerId_fkey" FOREIGN KEY ("agencyId", "customerId") REFERENCES "Customer"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaApplication" ADD CONSTRAINT "VisaApplication_agencyId_supplierId_fkey" FOREIGN KEY ("agencyId", "supplierId") REFERENCES "Supplier"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaStatusEvent" ADD CONSTRAINT "VisaStatusEvent_agencyId_visaId_fkey" FOREIGN KEY ("agencyId", "visaId") REFERENCES "VisaApplication"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_agencyId_ticketId_fkey" FOREIGN KEY ("agencyId", "ticketId") REFERENCES "Ticket"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_agencyId_visaId_fkey" FOREIGN KEY ("agencyId", "visaId") REFERENCES "VisaApplication"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_agencyId_customerId_fkey" FOREIGN KEY ("agencyId", "customerId") REFERENCES "Customer"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_agencyId_ticketId_fkey" FOREIGN KEY ("agencyId", "ticketId") REFERENCES "Ticket"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_agencyId_visaId_fkey" FOREIGN KEY ("agencyId", "visaId") REFERENCES "VisaApplication"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashAccount" ADD CONSTRAINT "CashAccount_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_agencyId_customerId_fkey" FOREIGN KEY ("agencyId", "customerId") REFERENCES "Customer"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_agencyId_supplierId_fkey" FOREIGN KEY ("agencyId", "supplierId") REFERENCES "Supplier"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_agencyId_invoiceId_fkey" FOREIGN KEY ("agencyId", "invoiceId") REFERENCES "Invoice"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_agencyId_cashAccountId_fkey" FOREIGN KEY ("agencyId", "cashAccountId") REFERENCES "CashAccount"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_agencyId_cashAccountId_fkey" FOREIGN KEY ("agencyId", "cashAccountId") REFERENCES "CashAccount"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_agencyId_invoiceId_fkey" FOREIGN KEY ("agencyId", "invoiceId") REFERENCES "Invoice"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_agencyId_ticketId_fkey" FOREIGN KEY ("agencyId", "ticketId") REFERENCES "Ticket"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_agencyId_visaId_fkey" FOREIGN KEY ("agencyId", "visaId") REFERENCES "VisaApplication"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_agencyId_cashAccountId_fkey" FOREIGN KEY ("agencyId", "cashAccountId") REFERENCES "CashAccount"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_agencyId_journalId_fkey" FOREIGN KEY ("agencyId", "journalId") REFERENCES "Journal"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Database-level financial integrity, independent of the HTTP application.
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "ledger_nonnegative" CHECK ("debit" >= 0 AND "credit" >= 0 AND "baseDebit" >= 0 AND "baseCredit" >= 0 AND NOT ("debit" > 0 AND "credit" > 0) AND "exchangeRate" > 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "invoice_positive" CHECK ("total" > 0 AND "exchangeRate" > 0);
ALTER TABLE "Payment" ADD CONSTRAINT "payment_positive" CHECK ("amount" > 0 AND "exchangeRate" > 0 AND (("direction" = 'IN' AND "invoiceId" IS NOT NULL AND "customerId" IS NOT NULL AND "supplierId" IS NULL) OR ("direction" = 'OUT' AND "supplierId" IS NOT NULL AND "invoiceId" IS NULL AND "customerId" IS NULL)));
ALTER TABLE "Expense" ADD CONSTRAINT "expense_positive" CHECK ("amount" > 0 AND "exchangeRate" > 0);
ALTER TABLE "Refund" ADD CONSTRAINT "refund_positive" CHECK ("amount" > 0);
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "exchange_positive" CHECK ("unitsPerUsd" > 0);
CREATE FUNCTION deny_financial_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Posted financial records and audit logs are immutable'; END; $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['Journal','LedgerEntry','Invoice','Payment','Expense','Refund','AuditLog','ExchangeRate'] LOOP EXECUTE format('CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION deny_financial_mutation()',t); END LOOP; END; $$;
CREATE FUNCTION check_journal_balance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target text; deb numeric; cred numeric; bdeb numeric; bcred numeric; n bigint;
BEGIN
 target := CASE WHEN TG_TABLE_NAME = 'Journal' THEN NEW."id" ELSE NEW."journalId" END;
 SELECT count(*), COALESCE(sum("debit"),0),COALESCE(sum("credit"),0),COALESCE(sum("baseDebit"),0),COALESCE(sum("baseCredit"),0) INTO n,deb,cred,bdeb,bcred FROM "LedgerEntry" WHERE "journalId"=target;
 IF n < 2 OR deb <> cred OR bdeb <> bcred THEN RAISE EXCEPTION 'Unbalanced journal'; END IF;
 RETURN NEW;
END; $$;
CREATE CONSTRAINT TRIGGER balanced_journal AFTER INSERT ON "Journal" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_journal_balance();
CREATE CONSTRAINT TRIGGER balanced_entries AFTER INSERT ON "LedgerEntry" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_journal_balance();
