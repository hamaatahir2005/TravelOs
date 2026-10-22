import { cookies } from 'next/headers';
import { isLanguage, type Language } from './i18n';
export async function readLanguage(fallback: Language = 'en'): Promise<Language> {
  const value = (await cookies()).get('travel-os-lang')?.value;
  return isLanguage(value) ? value : fallback;
}
