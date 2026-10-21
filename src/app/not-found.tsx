import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="empty-state">
      <h1>Page not found</h1>
      <p className="mt-4">This page is unavailable or you don’t have access.</p>
      <Link href="/dashboard" className="text-link justify-center">
        Return to your workspace →
      </Link>
    </main>
  );
}
