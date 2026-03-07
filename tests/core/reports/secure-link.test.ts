import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSecureReportLink, validateSecureReportLink } from '../../../src/core/reports/secure-link';

describe('secure-link', () => {
  beforeEach(() => {
    vi.stubEnv('REPORT_LINK_SECRET', 'test-secret-key-12345');
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.com');
  });

  describe('generateSecureReportLink', () => {
    it('generates a valid link with token', () => {
      const link = generateSecureReportLink('report-123');
      expect(link.token).toBeTruthy();
      expect(link.url).toContain('https://example.com/report/view/');
      expect(link.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('generates different tokens for different report IDs', () => {
      const link1 = generateSecureReportLink('report-1');
      const link2 = generateSecureReportLink('report-2');
      expect(link1.token).not.toBe(link2.token);
    });
  });

  describe('validateSecureReportLink', () => {
    it('validates a freshly generated token', () => {
      const link = generateSecureReportLink('report-abc');
      const result = validateSecureReportLink(link.token);
      expect(result.valid).toBe(true);
      expect(result.reportId).toBe('report-abc');
    });

    it('rejects an invalid token', () => {
      const result = validateSecureReportLink('invalid-token');
      expect(result.valid).toBe(false);
    });

    it('rejects a tampered token', () => {
      const link = generateSecureReportLink('report-xyz');
      // Tamper with the token
      const decoded = Buffer.from(link.token, 'base64url').toString();
      const tampered = decoded.replace('report-xyz', 'report-HACKED');
      const tamperedToken = Buffer.from(tampered).toString('base64url');
      const result = validateSecureReportLink(tamperedToken);
      expect(result.valid).toBe(false);
    });
  });
});
