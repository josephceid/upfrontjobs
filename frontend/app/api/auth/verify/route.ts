import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicToken, signSessionToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/recruiter/verify?error=missing', req.url));
  }

  try {
    const email = await verifyMagicToken(token);
    const sessionToken = await signSessionToken(email);

    const res = NextResponse.redirect(new URL('/recruiter/dashboard', req.url));
    res.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return res;
  } catch {
    return NextResponse.redirect(new URL('/recruiter/verify?error=invalid', req.url));
  }
}
