'use client';
import { useCallback, useEffect, useState } from 'react';
import { isLanguage, type Language } from '@/lib/i18n';
function persistLanguage(language: Language) {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
  localStorage.setItem('travel-os-lang', language);
  document.cookie = `travel-os-lang=${language}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
}
export function useLanguage(defaultLanguage: Language = 'en') {
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('travel-os-lang');
    const timer = setTimeout(() => {
      if (isLanguage(stored)) setLanguage(stored);
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (ready) persistLanguage(language);
  }, [language, ready]);
  const changeLanguage = useCallback((value: Language) => {
    persistLanguage(value);
    setLanguage(value);
  }, []);
  return [language, changeLanguage] as const;
}
