import { redirect } from 'next/navigation';
import { currentStaff } from '@/lib/auth';
import { Workspace } from '@/components/workspace';
export const dynamic = 'force-dynamic';
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const staff = await currentStaff();
  if (!staff) redirect('/login');
  return (
    <Workspace
      staff={{
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        agency: JSON.parse(JSON.stringify(staff.agency)),
      }}
    >
      {children}
    </Workspace>
  );
}
