import { SignJWT, jwtVerify } from 'jose';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function signMagicToken(email: string): Promise<string> {
  return new SignJWT({ purpose: 'magic-link' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(getSecret());
}

export async function verifyMagicToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getSecret());
  if (payload['purpose'] !== 'magic-link') throw new Error('Invalid token purpose');
  if (!payload.sub) throw new Error('Missing subject');
  return payload.sub;
}

export async function signSessionToken(email: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getSecret());
  if (!payload.sub) throw new Error('Missing subject');
  return payload.sub;
}
