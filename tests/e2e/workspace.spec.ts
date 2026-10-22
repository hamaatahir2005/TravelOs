import { test, expect, type Page } from '@playwright/test';
async function login(page: Page) {
  if (process.env.DEMO_MODE !== 'true' || !process.env.DEMO_EMAIL || !process.env.DEMO_PASSWORD)
    throw new Error('Browser mutation tests require an explicitly configured demo environment.');
  await page.goto('/login');
  await page.getByLabel('Email address').fill(process.env.DEMO_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Revenue overview')).toBeVisible();
}
test('unauthenticated operational access is blocked', async ({ page, request }) => {
  expect((await request.get('/api/data')).status()).toBe(401);
  await page.goto('/tickets');
  await expect(page).toHaveURL(/\/login$/);
  expect(
    (await request.post('/api/records/customers', { data: { name: 'Unauthorized' } })).status(),
  ).toBe(403);
});
test('desktop workflow: customer, ticket, invoice, visa, private document, expense and export', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page);
  await page.screenshot({
    path: 'artifacts/dashboard-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  const unique = Date.now();
  const name = `Demo Browser ${unique}`;
  await page.goto('/customers');
  await page.locator('.toolbar-buttons').getByRole('button', { name: 'Add record' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill(name);
  await dialog.getByLabel('Phone number').fill('+964 750 000 8888');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).not.toBeVisible();
  await page.goto('/tickets');
  await page.locator('.toolbar-buttons').getByRole('button', { name: 'Add record' }).click();
  dialog = page.getByRole('dialog');
  await dialog.locator('[name=customerId]').selectOption({ label: name });
  await dialog.locator('[name=supplierId]').selectOption({ index: 1 });
  for (const [field, value] of Object.entries({
    passengerName: name,
    airline: 'Demo Airways',
    origin: 'EBL',
    destination: 'IST',
    departureAt: '2026-12-15T10:00',
    arrivalAt: '2026-12-15T13:00',
    pnr: 'DEMO123',
    ticketNumber: `BROWSER-${unique}`,
    purchasePrice: '250',
    sellingPrice: '350',
    serviceFee: '25',
  }))
    await dialog.locator(`[name=${field}]`).fill(value);
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).not.toBeVisible();
  await page.locator('.table-search input').fill(name);
  await expect(page.locator('tbody')).toContainText('Demo Airways');
  await page.locator('tbody').getByRole('button', { name: 'View details' }).click();
  await expect(page.getByRole('dialog')).toContainText('HT-');
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click();
  await page.goto('/invoices');
  await page.locator('.table-search input').fill(name);
  const printHref = await page
    .locator('tbody a[aria-label="Print invoice"]')
    .first()
    .getAttribute('href');
  expect(printHref).toBeTruthy();
  const invoice = await page.request.get(printHref!);
  expect(invoice.ok()).toBe(true);
  expect(await invoice.text()).toContain(name);
  await page.goto('/visas');
  await page.locator('.toolbar-buttons').getByRole('button', { name: 'Add record' }).click();
  dialog = page.getByRole('dialog');
  await dialog.locator('[name=customerId]').selectOption({ label: name });
  await dialog.locator('[name=supplierId]').selectOption({ index: 1 });
  for (const [field, value] of Object.entries({
    country: 'Türkiye',
    visaType: 'Tourist',
    passportNumber: 'DEMO-BROWSER-001',
    passportExpiry: '2030-12-31',
    applicationDate: '2026-10-21',
    supplierFee: '75',
    governmentFee: '25',
    sellingPrice: '150',
  }))
    await dialog.locator(`[name=${field}]`).fill(value);
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).not.toBeVisible();
  await page.locator('.table-search input').fill(name);
  await page.locator('tbody').getByRole('button', { name: 'View details' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Reveal passport number' }).click();
  await expect(dialog).toContainText('DEMO-BROWSER-001');
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'fictional-passport.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n% Fictional browser test document\n%%EOF'),
  });
  await expect(dialog.getByText('fictional-passport.pdf')).toBeVisible();
  const documentHref = await dialog.getByText('fictional-passport.pdf').getAttribute('href');
  const download = await page.request.get(documentHref!);
  expect(download.status()).toBe(200);
  expect(download.headers()['content-disposition']).toContain('attachment');
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();
  await page.goto('/accounting');
  await page.getByRole('button', { name: 'Expenses', exact: true }).click();
  await page.locator('.toolbar-buttons').getByRole('button', { name: 'Add record' }).click();
  dialog = page.getByRole('dialog');
  await dialog.locator('[name=category]').fill('Browser QA');
  await dialog.locator('[name=description]').fill(`Demo expense ${unique}`);
  await dialog.locator('[name=amount]').fill('12.50');
  await dialog.locator('[name=cashAccountId]').selectOption({ index: 1 });
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).not.toBeVisible();
  await page.goto('/reports');
  await expect(page.getByText('All posted entries are balanced')).toBeVisible();
  const csv = await page.request.get('/api/export');
  expect(csv.status()).toBe(200);
  expect(csv.headers()['content-type']).toContain('text/csv');
  expect(errors).toEqual([]);
});
test('mobile layouts, Sorani RTL, Arabic RTL and dark theme', async ({ page }) => {
  await login(page);
  for (const [width, height, label] of [
    [390, 844, 'iphone'],
    [412, 915, 'android'],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect(page.locator('.mobile-menu')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `artifacts/dashboard-${label}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  await page.getByLabel('Language', { exact: true }).selectOption('ckb');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.getByRole('button', { name: 'کردنەوەی ڕێنیشاندەر' }).click();
  await expect(page.getByRole('link', { name: 'بلیتی فڕۆکە' })).toBeVisible();
  await page.getByRole('button', { name: 'داخستنی لیستی ڕێنیشاندەر', exact: true }).click();
  await page.getByRole('button', { name: 'دۆخی تاریک', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.screenshot({
    path: 'artifacts/dashboard-sorani-dark.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.getByLabel('زمان', { exact: true }).selectOption('ar');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
});

test('language persists through login, reports, receipts and validation errors', async ({
  page,
}) => {
  await page.goto('/login');
  await page.locator('.login-language select').selectOption('ckb');
  await expect(page.getByRole('heading', { name: 'بەخێربێیتەوە' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ckb');
  await page.locator('[name=email]').fill(process.env.DEMO_EMAIL!);
  await page.locator('[name=password]').fill(process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: 'چوونەژوورەوە بۆ شوێنی کار', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('پوختەی دارایی', { exact: true })).toBeVisible();
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'قازانج و زیان' })).toBeVisible();
  await expect(page.getByText('هەموو تۆمارە داراییەکان هاوسەنگن')).toBeVisible();
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'پاشەکەوت و گەڕاندنەوە' })).toBeVisible();
  const data = await (await page.request.get('/api/data')).json();
  await page.goto(`/print/invoice/${data.invoices[0].id}`);
  await expect(page.locator('main')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByText('بڕی پێویست بۆ پارەدان', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'چاپ / پاشەکەوتی PDF' })).toBeVisible();
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'چوونەدەرەوە', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.locator('.login-language select').selectOption('ar');
  await expect(page.getByRole('heading', { name: 'مرحباً بعودتك' })).toBeVisible();
  await page.locator('[name=email]').fill(process.env.DEMO_EMAIL!);
  await page.locator('[name=password]').fill('Intentionally-invalid-demo-password');
  await page.getByRole('button', { name: 'الدخول إلى مساحة العمل', exact: true }).click();
  await expect(page.locator('.login-form').getByRole('alert')).toContainText(
    'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  );
});
