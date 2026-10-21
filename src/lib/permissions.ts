import type { Role } from '@prisma/client';
export const modules = [
  'dashboard',
  'customers',
  'tickets',
  'visas',
  'suppliers',
  'accounting',
  'invoices',
  'reports',
  'employees',
  'settings',
  'audit',
] as const;
export type Module = (typeof modules)[number];
const grants: Record<Role, readonly Module[]> = {
  SUPER_ADMIN: modules,
  AGENCY_MANAGER: modules,
  TICKET_AGENT: ['dashboard', 'customers', 'tickets', 'suppliers', 'invoices'],
  VISA_OFFICER: ['dashboard', 'customers', 'visas', 'suppliers', 'invoices'],
  ACCOUNTANT: ['dashboard', 'customers', 'suppliers', 'accounting', 'invoices', 'reports', 'audit'],
};
export function can(role: Role, module: Module, write = false) {
  if (!grants[role]?.includes(module)) return false;
  if (
    write &&
    ['suppliers', 'invoices'].includes(module) &&
    ['TICKET_AGENT', 'VISA_OFFICER'].includes(role)
  )
    return false;
  return true;
}
