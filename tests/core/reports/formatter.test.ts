import { describe, it, expect } from 'vitest';
import {
  formatUserReportForWhatsApp,
  formatReportSummary,
  formatEmployerReportForWhatsApp,
} from '../../../src/core/reports/formatter';
import type { UserReport } from '../../../src/core/reports/user-report';
import type { EmployerReport } from '../../../src/core/reports/employer-report';

describe('formatter', () => {
  const mockUserReport: UserReport = {
    sections: [
      { id: 's1', titleHe: 'סיכום', contentHe: 'תוכן הסיכום' },
      { id: 's2', titleHe: 'חסמים', contentHe: 'חסם א\nחסם ב' },
    ],
    recommendations: [],
    generatedAt: new Date(),
  };

  describe('formatUserReportForWhatsApp', () => {
    it('formats each section as a separate message', () => {
      const messages = formatUserReportForWhatsApp(mockUserReport);
      expect(messages).toHaveLength(2);
      expect(messages[0].text).toContain('*סיכום*');
      expect(messages[0].text).toContain('תוכן הסיכום');
      expect(messages[1].text).toContain('*חסמים*');
    });

    it('respects 4096-char limit per message', () => {
      const longContent = 'א'.repeat(5000);
      const report: UserReport = {
        sections: [{ id: 's1', titleHe: 'ארוך', contentHe: longContent }],
        recommendations: [],
        generatedAt: new Date(),
      };
      const messages = formatUserReportForWhatsApp(report);
      expect(messages.length).toBeGreaterThan(1);
      for (const msg of messages) {
        expect(msg.text.length).toBeLessThanOrEqual(4096);
      }
    });
  });

  describe('formatReportSummary', () => {
    it('includes recommendation count', () => {
      const summary = formatReportSummary(mockUserReport);
      expect(summary).toContain('0 המלצות');
      expect(summary).toContain('2 חלקים');
    });
  });

  describe('formatEmployerReportForWhatsApp', () => {
    it('formats employer report sections', () => {
      const report: EmployerReport = {
        sections: [
          { id: 'p1', titleHe: 'מטרה', contentHe: 'תוכן המטרה' },
        ],
        recommendations: [],
        generatedAt: new Date(),
      };
      const messages = formatEmployerReportForWhatsApp(report);
      expect(messages).toHaveLength(1);
      expect(messages[0].text).toContain('*מטרה*');
    });
  });
});
