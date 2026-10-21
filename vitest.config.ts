import { defineConfig } from 'vitest/config';
import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
if (process.env.RUN_DB_TESTS === 'true') {
  if (
    !process.env.TEST_DATABASE_URL ||
    !new URL(process.env.TEST_DATABASE_URL).pathname.includes('test')
  )
    throw new Error(
      'Integration tests require a dedicated TEST_DATABASE_URL with test in the database name',
    );
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
