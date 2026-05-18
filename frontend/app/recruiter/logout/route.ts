import { NextRequest, NextResponse } from 'next/server';

export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/recruiter/login', req.url));
  res.cookies.delete('session');
  return res;
}
