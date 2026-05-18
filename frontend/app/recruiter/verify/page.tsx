import Link from 'next/link';

const ERROR_MESSAGES: Record<string, string> = {
  missing: 'No login token was found in this link.',
  invalid: 'This link is invalid or has expired.',
};

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function VerifyPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const message = ERROR_MESSAGES[error ?? ''] ?? 'Something went wrong.';

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Link expired</h1>
        <p className="text-gray-500 text-sm mb-6">{message} Please request a new magic link.</p>
        <Link
          href="/recruiter/login"
          className="inline-block bg-brand-600 text-white font-medium py-2 px-6 rounded-md hover:bg-brand-700 transition-colors text-sm"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
