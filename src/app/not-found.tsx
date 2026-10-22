import Link from 'next/link';
import { readLanguage } from '@/lib/server-language';
import { translate } from '@/lib/i18n';
export default async function NotFound() {
  const language = await readLanguage();
  const t = (key: string) => translate(language, key);
  return (
    <main className="empty-state">
      <h1>{t('Page not found')}</h1>
      <p className="mt-4">{t('This page is unavailable or you don’t have access.')}</p>
      <Link href="/dashboard" className="text-link justify-center">
        {t('Return to your workspace →')}
      </Link>
    </main>
  );
}
