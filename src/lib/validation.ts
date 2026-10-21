import { z } from 'zod';
const text = z.string().trim().min(1).max(200);
const optionalText = z.string().trim().max(2000).default('');
const money = z
  .union([z.string(), z.number()])
  .transform(String)
  .refine((v) => /^\d{1,12}(\.\d{1,2})?$/.test(v), 'Use a positive amount with at most 2 decimals');
const date = z.coerce.date();
const currency = z.enum(['USD', 'IQD']).default('USD');
const trade = {
  customerId: text,
  supplierId: text,
  sellingPrice: money,
  currency,
  notes: optionalText,
};
export const schemas = {
  customers: z.object({
    name: text,
    email: z.union([z.email(), z.literal('')]).default(''),
    phone: text,
    nationality: optionalText,
    notes: optionalText,
  }),
  suppliers: z.object({
    name: text,
    email: z.union([z.email(), z.literal('')]).default(''),
    phone: optionalText,
    notes: optionalText,
  }),
  tickets: z
    .object({
      ...trade,
      passengerName: text,
      airline: text,
      origin: z.string().trim().length(3).toUpperCase(),
      destination: z.string().trim().length(3).toUpperCase(),
      departureAt: date,
      arrivalAt: date,
      pnr: z.string().trim().min(4).max(12).toUpperCase(),
      ticketNumber: text,
      purchasePrice: money,
      serviceFee: money.default('0'),
    })
    .refine((v) => v.arrivalAt > v.departureAt, 'Arrival must follow departure')
    .refine((v) => v.origin !== v.destination, 'Choose different airports'),
  visas: z
    .object({
      ...trade,
      country: text,
      visaType: text,
      passportNumber: z.string().trim().min(5).max(30),
      passportExpiry: date,
      applicationDate: date,
      submissionDate: date.nullish(),
      reminderAt: date.nullish(),
      requiredDocuments: z.array(text).max(20).default([]),
      supplierFee: money,
      governmentFee: money.default('0'),
    })
    .refine((v) => v.passportExpiry > new Date(), 'Passport must not be expired'),
  expenses: z.object({
    category: text,
    description: text,
    amount: money,
    currency,
    cashAccountId: text,
    date,
  }),
  payments: z
    .object({
      invoiceId: text.optional(),
      supplierId: text.optional(),
      cashAccountId: text,
      amount: money,
      currency,
      reference: text,
      direction: z.enum(['IN', 'OUT']),
    })
    .refine(
      (v) => (v.direction === 'IN' ? !!v.invoiceId : !!v.supplierId),
      'Select an invoice or supplier',
    ),
  refunds: z.object({
    invoiceId: text,
    amount: money,
    reason: text,
    cashAccountId: text.optional(),
  }),
  employees: z.object({
    name: text,
    email: z.email(),
    password: z.string().min(12).max(128),
    role: z.enum(['SUPER_ADMIN', 'AGENCY_MANAGER', 'TICKET_AGENT', 'VISA_OFFICER', 'ACCOUNTANT']),
  }),
  settings: z.object({
    name: text,
    address: optionalText,
    phone: optionalText,
    email: z.union([z.email(), z.literal('')]).default(''),
    receiptHeader: optionalText,
    invoicePrefix: z.string().regex(/^[A-Z0-9-]{1,12}$/),
    currency,
    language: z.enum(['en', 'ar', 'ckb']),
  }),
  exchangeRates: z.object({
    currency: z.enum(['IQD']),
    unitsPerUsd: z.coerce.number().positive().max(100000),
  }),
  cashAccounts: z.object({ name: text, currency }),
};
export const ticketUpdate = z.object({
  id: text,
  status: z.enum(['CONFIRMED', 'PENDING', 'CANCELLED', 'COMPLETED']).optional(),
  passengerName: text.optional(),
  airline: text.optional(),
  origin: z.string().length(3).toUpperCase().optional(),
  destination: z.string().length(3).toUpperCase().optional(),
  departureAt: date.optional(),
  arrivalAt: date.optional(),
  pnr: z.string().trim().min(4).max(12).optional(),
  notes: optionalText.optional(),
});
export const visaUpdate = z.object({
  id: text,
  status: z
    .enum([
      'DRAFT',
      'DOCUMENTS_PENDING',
      'SUBMITTED',
      'PROCESSING',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
    ])
    .optional(),
  note: optionalText,
  submissionDate: date.nullish(),
  reminderAt: date.nullish(),
  notes: optionalText.optional(),
});
