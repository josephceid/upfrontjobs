'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Recruiter login</h1>
        <p className="text-gray-500 mb-8 text-sm">
          Enter your email and we&apos;ll send you a magic link to sign in.
        </p>
        {status === 'sent' ? (
          <div className="bg-brand-50 border border-brand-300 rounded-lg p-4 text-brand-700 text-sm">
            Check your inbox — we sent a login link to <strong>{email}</strong>. It expires in 15 minutes.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-sm"
              />
            </div>
            {status === 'error' && (
              <p className="text-red-600 text-sm">Something went wrong. Please try again.</p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-brand-600 text-white font-medium py-2 px-4 rounded-md hover:bg-brand-700 transition-colors disabled:opacity-60 text-sm"
            >
              {status === 'loading' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
