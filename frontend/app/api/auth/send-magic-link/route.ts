import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { signMagicToken } from '@/lib/auth';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return new Resend(key);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const allowedEmails = process.env.ALLOWED_RECRUITER_EMAILS;
  if (allowedEmails) {
    const allowed = allowedEmails.split(',').map((e) => e.trim().toLowerCase());
    if (!allowed.includes(email.toLowerCase())) {
      // Return 200 to avoid leaking whether the email is allowed
      return NextResponse.json({ ok: true });
    }
  }

  try {
    const token = await signMagicToken(email);
    const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
    const magicLink = `${baseUrl}/api/auth/verify?token=${token}`;
    const from = process.env.RESEND_FROM_EMAIL ?? 'Upfront Jobs <noreply@upfrontjobs.co.uk>';

    await getResend().emails.send({
      from,
      to: email,
      subject: 'Your Upfront Jobs login link',
      html: `
        <p>Click the link below to log in to your Upfront Jobs recruiter account.</p>
        <p><a href="${magicLink}">Log in to Upfront Jobs</a></p>
        <p>This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to send magic link:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
