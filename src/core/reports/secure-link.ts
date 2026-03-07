import { createHmac, timingSafeEqual } from 'crypto';

const LINK_EXPIRY_DAYS = 7;

function getSecret(): string {
  const secret = process.env.REPORT_LINK_SECRET ?? process.env.ADMIN_SECRET;
  if (!secret) throw new Error('REPORT_LINK_SECRET or ADMIN_SECRET must be set');
  return secret;
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
}

export interface SecureReportLink {
  token: string;
  url: string;
  expiresAt: Date;
}

/**
 * Generates an HMAC-signed secure link for viewing a report.
 */
export function generateSecureReportLink(reportId: string): SecureReportLink {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + LINK_EXPIRY_DAYS);
  const expiresMs = expiresAt.getTime();

  const payload = `${reportId}:${expiresMs}`;
  const signature = createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex');

  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');
  const url = `${getBaseUrl()}/report/view/${token}`;

  return { token, url, expiresAt };
}

/**
 * Validates a secure report link token.
 */
export function validateSecureReportLink(
  token: string
): { valid: boolean; reportId?: string } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 3) return { valid: false };

    const [reportId, expiresMs, signature] = parts;

    // Check expiry
    const expires = parseInt(expiresMs, 10);
    if (isNaN(expires) || Date.now() > expires) {
      return { valid: false };
    }

    // Verify signature
    const payload = `${reportId}:${expiresMs}`;
    const expected = createHmac('sha256', getSecret())
      .update(payload)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) return { valid: false };

    if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false };
    }

    return { valid: true, reportId };
  } catch {
    return { valid: false };
  }
}
