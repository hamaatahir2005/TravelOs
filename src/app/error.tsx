'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-state">
      <h1>We couldn’t load this workspace</h1>
      <p className="mt-4">
        Please try again. If this continues, contact your agency administrator.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
