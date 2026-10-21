import { hash } from 'bcryptjs';
import { db } from '../src/lib/db';
async function main() {
  if (process.env.DEMO_MODE === 'true') throw new Error('Use the separate demo seed in demo mode');
  const { STAFF_EMAIL, STAFF_PASSWORD, STAFF_NAME, AGENCY_NAME } = process.env;
  if (!STAFF_EMAIL || !STAFF_PASSWORD || STAFF_PASSWORD.length < 12 || !STAFF_NAME || !AGENCY_NAME)
    throw new Error(
      'Set STAFF_EMAIL, STAFF_PASSWORD (12+ characters), STAFF_NAME and AGENCY_NAME for initial setup.',
    );
  if (await db.agency.count())
    throw new Error(
      'Initial setup requires an empty database. Add staff through Team & access afterward.',
    );
  await db.agency.create({
    data: {
      name: AGENCY_NAME,
      staff: {
        create: {
          name: STAFF_NAME,
          email: STAFF_EMAIL.toLowerCase(),
          passwordHash: await hash(STAFF_PASSWORD, 12),
          role: 'SUPER_ADMIN',
        },
      },
      exchangeRates: { create: { currency: 'IQD', unitsPerUsd: 1450 } },
      cashAccounts: {
        create: [
          { name: 'Main cash · USD', currency: 'USD' },
          { name: 'Main cash · IQD', currency: 'IQD' },
        ],
      },
    },
  });
  console.log(
    'Production administrator created. Change the example exchange rate before recording transactions.',
  );
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
