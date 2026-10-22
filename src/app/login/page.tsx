import { Login } from '@/components/login';
import { readLanguage } from '@/lib/server-language';
export const dynamic = 'force-dynamic';
export default async function Page() {
  return <Login demo={process.env.DEMO_MODE === 'true'} initialLanguage={await readLanguage()} />;
}
