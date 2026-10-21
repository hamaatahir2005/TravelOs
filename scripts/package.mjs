import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
const root = '.next/standalone';
if (!existsSync(root)) throw new Error('Standalone build is missing');
cpSync('public', `${root}/public`, { recursive: true });
cpSync('.next/static', `${root}/.next/static`, { recursive: true });
// Runtime secrets belong to the host environment, never to the deployable bundle.
for (const name of readdirSync(root))
  if (name === '.env' || name.startsWith('.env.')) rmSync(`${root}/${name}`);
