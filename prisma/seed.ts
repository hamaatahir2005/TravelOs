import { hash } from 'bcryptjs';
import { db } from '../src/lib/db';
import { createRecord, updateRecord } from '../src/lib/operations';
import { post, D } from '../src/lib/finance';
async function main() {
  const database = new URL(process.env.DATABASE_URL ?? '').pathname;
  if (
    process.env.DEMO_MODE !== 'true' ||
    process.env.ALLOW_DEMO_SEED !== 'true' ||
    !database.toLowerCase().includes('demo')
  )
    throw new Error(
      'Seeding requires DEMO_MODE=true, ALLOW_DEMO_SEED=true, and a separate database with demo in its name.',
    );
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error('Configure DEMO_EMAIL and DEMO_PASSWORD (12+ characters).');
  if (await db.agency.count())
    throw new Error(
      'Seed only an empty, dedicated demo database. Existing records will not be changed.',
    );
  const agency = await db.agency.create({
    data: {
      name: 'Horizon Travel',
      isDemo: true,
      address: '100 Fictional Avenue, Erbil, Iraq',
      phone: '+964 750 000 0000',
      email: 'hello@horizon.example',
      invoicePrefix: 'HT',
      receiptHeader: 'Thank you for traveling with Horizon. This is a fictional demo receipt.',
    },
  });
  const staff = await db.staff.create({
    data: {
      agencyId: agency.id,
      name: 'Dara Ahmed',
      email: email.toLowerCase(),
      passwordHash: await hash(password, 12),
      role: 'SUPER_ADMIN',
    },
  });
  const actor = { id: staff.id, agencyId: agency.id, role: staff.role };
  await db.exchangeRate.create({
    data: { agencyId: agency.id, currency: 'IQD', unitsPerUsd: 1450 },
  });
  const usd = await db.cashAccount.create({
    data: { agencyId: agency.id, name: 'Main cash · USD', currency: 'USD' },
  });
  const iqd = await db.cashAccount.create({
    data: { agencyId: agency.id, name: 'Main cash · IQD', currency: 'IQD' },
  });
  await db.$transaction(async (tx) => {
    await post(tx, actor, 'OPENING-USD', 'Demo opening balance', 'USD', D(1), [
      { account: `CASH:${usd.id}`, debit: 25000, credit: 0 },
      { account: 'OPENING_EQUITY', debit: 0, credit: 25000 },
    ]);
    await post(tx, actor, 'OPENING-IQD', 'Demo opening balance', 'IQD', D(1450), [
      { account: `CASH:${iqd.id}`, debit: 15000000, credit: 0 },
      { account: 'OPENING_EQUITY', debit: 0, credit: 15000000 },
    ]);
  });
  const names = [
    'Ari Barzan',
    'Lana Mustafa',
    'Roj Ahmed',
    'Sara Hassan',
    'Dilan Karim',
    'Omar Khalid',
    'Shilan Ali',
    'Rebaz Osman',
    'Narin Hama',
    'Zana Salih',
    'Hana Sherwan',
    'Azad Mahmood',
  ];
  const customers = [];
  for (const [i, name] of names.entries())
    customers.push(
      await db.customer.create({
        data: {
          agencyId: agency.id,
          name,
          email: `traveler${i + 1}@example.com`,
          phone: `+964 750 000 ${String(i + 10).padStart(4, '0')}`,
          nationality: 'Iraqi',
          notes:
            i % 3 === 0
              ? 'Prefers morning departures. Fictional customer.'
              : 'Fictional sample customer.',
        },
      }),
    );
  const suppliers = [];
  for (const name of [
    'Atlas Air Consolidator',
    'Global Visa Services',
    'Mesopotamia Travel Partners',
  ])
    suppliers.push(
      await db.supplier.create({
        data: {
          agencyId: agency.id,
          name,
          email: `${name.split(' ')[0].toLowerCase()}@example.com`,
          phone: '+964 750 000 9999',
        },
      }),
    );
  const routes = [
    ['EBL', 'IST', 'Turkish Airlines'],
    ['EBL', 'DXB', 'flydubai'],
    ['BGW', 'DOH', 'Qatar Airways'],
    ['EBL', 'AMM', 'Royal Jordanian'],
    ['EBL', 'FRA', 'Lufthansa'],
    ['BGW', 'CAI', 'EgyptAir'],
  ];
  for (let i = 0; i < 36; i++) {
    const [origin, destination, airline] = routes[i % routes.length];
    const createdAt = new Date();
    createdAt.setMonth(createdAt.getMonth() - Math.floor(i / 6));
    createdAt.setDate(Math.min(27, (i % 6) * 4 + 2));
    const departure = new Date(
      i < 6 ? Date.now() + (i + 1) * 86400000 : createdAt.getTime() + 5 * 86400000,
    );
    departure.setHours(9 + (i % 7), 30, 0, 0);
    const sell = 430 + (i % 7) * 145 + (5 - Math.floor(i / 6)) * 30;
    const cost = Math.round(sell * 0.73);
    const result = await createRecord(
      'tickets',
      {
        customerId: customers[i % 12].id,
        supplierId: suppliers[i % 2 === 0 ? 0 : 2].id,
        passengerName: customers[i % 12].name,
        airline,
        origin,
        destination,
        departureAt: departure,
        arrivalAt: new Date(departure.getTime() + 3 * 3600000),
        pnr: `HR${String(2000 + i)}`,
        ticketNumber: `TK-2026-${10000 + i}`,
        purchasePrice: String(cost),
        sellingPrice: String(sell),
        serviceFee: '25',
        currency: 'USD',
        notes: 'Fictional demo ticket. Manual entry.',
      },
      { ...actor, at: createdAt },
    );
    const invoice = await db.invoice.findUniqueOrThrow({
      where: { id: (result as { invoiceId: string }).invoiceId },
    });
    if (i % 5 !== 0)
      await createRecord(
        'payments',
        {
          invoiceId: invoice.id,
          cashAccountId: usd.id,
          amount: String(i % 4 === 0 ? Math.round((sell + 25) * 0.5) : sell + 25),
          currency: 'USD',
          reference: `DEMO-REC-${i + 1}`,
          direction: 'IN',
        },
        { ...actor, at: createdAt },
      );
    if (i >= 6)
      await updateRecord(
        'tickets',
        { id: (result as { id: string }).id, status: 'COMPLETED' },
        actor,
      );
  }
  for (let i = 0; i < 12; i++) {
    const country = ['United Arab Emirates', 'Türkiye', 'Saudi Arabia', 'United Kingdom'][i % 4];
    const result = await createRecord(
      'visas',
      {
        customerId: customers[i].id,
        supplierId: suppliers[1].id,
        country,
        visaType: i % 2 ? 'Tourist · 30 days' : 'Business · 90 days',
        passportNumber: `DEMO-P${10000 + i}`,
        passportExpiry: new Date(Date.now() + 800 * 86400000),
        applicationDate: new Date(Date.now() - i * 86400000),
        reminderAt: new Date(Date.now() + (i + 2) * 86400000),
        requiredDocuments: ['Passport scan', 'Passport photo', 'Travel itinerary'],
        supplierFee: '85',
        governmentFee: '35',
        sellingPrice: String(210 + i * 15),
        currency: 'USD',
        notes: 'Fictional visa application. No real passport data.',
      },
      actor,
    );
    await updateRecord(
      'visas',
      {
        id: (result as { id: string }).id,
        status: ['PROCESSING', 'APPROVED', 'DOCUMENTS_PENDING', 'SUBMITTED'][i % 4],
        note: 'Demo status update',
      },
      actor,
    );
  }
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    await createRecord(
      'expenses',
      {
        category: i % 2 ? 'Office rent' : 'Operations',
        description: i % 2 ? 'Monthly agency office rent' : 'Internet, communications & supplies',
        amount: String(i % 2 ? 850 : 175 + i * 15),
        currency: 'USD',
        cashAccountId: usd.id,
        date,
      },
      { ...actor, at: date },
    );
  }
  await createRecord(
    'payments',
    {
      supplierId: suppliers[0].id,
      cashAccountId: usd.id,
      amount: '3000',
      currency: 'USD',
      reference: 'DEMO-SUP-001',
      direction: 'OUT',
    },
    actor,
  );
  console.log(
    'Demo workspace created. Sign in using your configured DEMO_EMAIL and DEMO_PASSWORD.',
  );
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
