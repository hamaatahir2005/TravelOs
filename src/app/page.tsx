import { redirect } from 'next/navigation';
import { currentStaff } from '@/lib/auth';
export default async function Home() {
  const staff = await currentStaff();
  redirect(staff ? '/dashboard' : '/login');
}
