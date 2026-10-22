'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plane, ArrowRight, ShieldCheck, Globe2, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { translate, type Language } from '@/lib/i18n';
import { Button } from './ui/button';
export function Login({
  demo,
  initialLanguage = 'en',
}: {
  demo: boolean;
  initialLanguage?: Language;
}) {
  const router = useRouter();
  const [lang, setLang] = useLanguage(initialLanguage);
  const t = (key: string) => translate(lang, key);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.push('/dashboard');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in');
      setBusy(false);
    }
  }
  return (
    <main className="login-layout">
      <section className="login-story">
        <div className="brand">
          <span className="brand-icon">
            <Plane size={25} />
          </span>
          <span>
            travel<span className="brand-os">OS</span>
          </span>
        </div>
        <div className="story-content">
          <div className="eyebrow">
            <span />
            {t('THE WORLD IS YOUR WORKSPACE')}
          </div>
          <h1>
            {t('Every journey.')}
            <br />
            {t('Every detail.')}
            <br />
            <em>{t('One workspace.')}</em>
          </h1>
          <p>
            {t('A calmer way to manage your travel agency.')}
            <br />
            {t('Bring your bookings, customers and finances together.')}
          </p>
          <div className="orbit-art">
            <Globe2 size={210} strokeWidth={0.5} />
            <span className="orbit-plane">
              <Plane size={30} />
            </span>
            <span className="orbit-dot" />
          </div>
        </div>
        <div className="story-footer">
          <ShieldCheck size={16} />
          {t('Private by design. Built for your team.')}
        </div>
      </section>
      <section className="login-form-wrap">
        <div className="login-form">
          <div className="login-language">
            <label>
              {t('language')}
              <select value={lang} onChange={(e) => setLang(e.target.value as typeof lang)}>
                <option value="en">English</option>
                <option value="ckb">کوردی سۆرانی</option>
                <option value="ar">العربية</option>
              </select>
            </label>
          </div>
          <div className="login-mobile-brand">
            <Plane /> Travel OS
          </div>
          <span className="section-kicker">{t('YOUR AGENCY. CONNECTED.')}</span>
          <h2>{t('Welcome back')}</h2>
          <p className="subtle">{t('Sign in to your agency workspace.')}</p>
          {demo && (
            <div className="demo-notice">{t('Demo environment \u00B7 Fictional data only')}</div>
          )}
          <form onSubmit={submit}>
            <label>
              {t('Email address')}
              <input
                autoComplete="username"
                name="email"
                type="email"
                placeholder="you@youragency.com"
                required
              />
            </label>
            <label>
              {t('Password')}
              <div className="password-input">
                <input
                  autoComplete="current-password"
                  name="password"
                  type={show ? 'text' : 'password'}
                  placeholder={t('Enter your password')}
                  required
                  maxLength={128}
                />
                <button
                  type="button"
                  aria-label={t(show ? 'Hide password' : 'Show password')}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {error && (
              <div className="error-notice" role="alert">
                {t(error)}
              </div>
            )}
            <Button className="w-full h-12 mt-2" disabled={busy}>
              {t(busy ? 'Signing in…' : 'Sign in to workspace')}
              <ArrowRight size={17} />
            </Button>
          </form>
          <div className="login-help">
            <ShieldCheck size={16} />
            <span>
              {t('Authorized agency staff only.')}
              <br />
              {t('Need access? Contact your agency administrator.')}
            </span>
          </div>
        </div>
        <span className="login-copyright">
          © {new Date().getFullYear()}
          {t('Travel OS. Your next chapter, organized.')}
        </span>
      </section>
    </main>
  );
}
