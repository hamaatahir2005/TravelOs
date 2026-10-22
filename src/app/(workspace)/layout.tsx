import { redirect } from 'next/navigation';
import { currentStaff } from '@/lib/auth';
import { Workspace } from '@/components/workspace';
import { readLanguage } from '@/lib/server-language';
import { isLanguage } from '@/lib/i18n';
export const dynamic = 'force-dynamic';
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const staff = await currentStaff();
  if (!staff) redirect('/login');
  return (
    <Workspace
      initialLanguage={await readLanguage(
        isLanguage(staff.agency.language) ? staff.agency.language : 'en',
      )}
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
