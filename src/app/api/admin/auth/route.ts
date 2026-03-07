import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_EXPIRY_HOURS = 24;

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD is not set');
  return password;
}

function getAdminSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error('ADMIN_SECRET is not set');
  return secret;
}

export function createSessionToken(): string {
  const secret = getAdminSecret();
  const expires = Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
  const payload = `admin:${expires}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}:${signature}`;
}

export function verifySessionToken(token: string): boolean {
  try {
    const secret = getAdminSecret();
    const parts = token.split(':');
    if (parts.length !== 3) return false;

    const [role, expiresStr, signature] = parts;
    if (role !== 'admin') return false;

    const expires = parseInt(expiresStr, 10);
    if (Date.now() > expires) return false;

    const expectedSignature = createHmac('sha256', secret)
      .update(`${role}:${expiresStr}`)
      .digest('hex');

    const sigBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expectedSignature, 'hex');

    if (sigBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}

// POST /api/admin/auth — login with admin password
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { password?: string };
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const expected = getAdminPassword();
    const passwordMatch =
      password.length === expected.length &&
      timingSafeEqual(Buffer.from(password), Buffer.from(expected));

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = createSessionToken();

    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_EXPIRY_HOURS * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
