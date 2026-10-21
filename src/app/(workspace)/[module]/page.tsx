import { notFound } from 'next/navigation';
import { ModulePage } from '@/components/module-page';
import { modules } from '@/lib/permissions';
export default async function Page({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (!modules.includes(module as (typeof modules)[number])) notFound();
  return <ModulePage module={module as (typeof modules)[number]} />;
}
