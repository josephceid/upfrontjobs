import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '');
}

export async function middleware(req: NextRequest) {
  const session = req.cookies.get('session')?.value;
  if (!session) {
    return NextResponse.redirect(new URL('/recruiter/login', req.url));
  }
  try {
    await jwtVerify(session, getSecret());
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/recruiter/login', req.url));
  }
}

export const config = {
  matcher: ['/recruiter/dashboard/:path*'],
};
