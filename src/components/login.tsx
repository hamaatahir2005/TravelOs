'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plane, ArrowRight, ShieldCheck, Globe2, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
export function Login({ demo }: { demo: boolean }) {
  const router = useRouter();
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
            <span /> THE WORLD IS YOUR WORKSPACE
          </div>
          <h1>
            Every journey.
            <br />
            Every detail.
            <br />
            <em>One workspace.</em>
          </h1>
          <p>
            A calmer way to manage your travel agency.
            <br />
            Bring your bookings, customers and finances together.
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
          <ShieldCheck size={16} /> Private by design. Built for your team.
        </div>
      </section>
      <section className="login-form-wrap">
        <div className="login-form">
          <div className="login-mobile-brand">
            <Plane /> Travel OS
          </div>
          <span className="section-kicker">YOUR AGENCY. CONNECTED.</span>
          <h2>Welcome back</h2>
          <p className="subtle">Sign in to your agency workspace.</p>
          {demo && <div className="demo-notice">Demo environment · Fictional data only</div>}
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                autoComplete="username"
                name="email"
                type="email"
                placeholder="you@youragency.com"
                required
              />
            </label>
            <label>
              Password
              <div className="password-input">
                <input
                  autoComplete="current-password"
                  name="password"
                  type={show ? 'text' : 'password'}
                  placeholder="Enter your password"
                  required
                  maxLength={128}
                />
                <button
                  type="button"
                  aria-label={show ? 'Hide password' : 'Show password'}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {error && (
              <div className="error-notice" role="alert">
                {error}
              </div>
            )}
            <Button className="w-full h-12 mt-2" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in to workspace'}
              <ArrowRight size={17} />
            </Button>
          </form>
          <div className="login-help">
            <ShieldCheck size={16} />
            <span>
              Authorized agency staff only.
              <br />
              Need access? Contact your agency administrator.
            </span>
          </div>
        </div>
        <span className="login-copyright">
          © {new Date().getFullYear()} Travel OS. Your next chapter, organized.
        </span>
      </section>
    </main>
  );
}
