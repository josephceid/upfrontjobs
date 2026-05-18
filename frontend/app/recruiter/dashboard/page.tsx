import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  const email = session ? await verifySessionToken(session) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Recruiter Dashboard</h1>
        <a
          href="/recruiter/logout"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Sign out
        </a>
      </div>
      <p className="text-gray-600 text-sm">
        Signed in as <strong>{email}</strong>.
      </p>
    </div>
  );
}
