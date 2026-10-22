'use client';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { translate } from '@/lib/i18n';
export default function ErrorPage({ reset }: { reset: () => void }) {
  const [language] = useLanguage();
  const t = (key: string) => translate(language, key);
  return (
    <main className="error-state">
      <h1>{t('We couldn’t load this workspace')}</h1>
      <p className="mt-4">
        {t('Please try again. If this continues, contact your agency administrator.')}
      </p>
      <Button onClick={reset}>{t('retry')}</Button>
    </main>
  );
}
