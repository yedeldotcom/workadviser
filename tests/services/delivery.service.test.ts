import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeliveryService } from '../../src/services/delivery.service';
import { createMockPrisma, mockFn } from '../helpers/prisma-mock';
import type { PrismaClient } from '@prisma/client';

// Mock WhatsApp client
vi.mock('../../src/core/whatsapp/client', () => ({
  sendTextMessage: vi.fn().mockResolvedValue({ messages: [{ id: 'msg-1' }] }),
  sendInteractiveButtons: vi.fn().mockResolvedValue({ messages: [{ id: 'msg-2' }] }),
}));

// Mock secure link
vi.mock('../../src/core/reports/secure-link', () => ({
  generateSecureReportLink: vi.fn().mockReturnValue({
    token: 'test-token',
    url: 'https://example.com/report/view/test-token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }),
}));

describe('DeliveryService', () => {
  let prisma: PrismaClient;
  let service: DeliveryService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
    service = new DeliveryService(prisma);

    mockFn(prisma, 'auditLog', 'create').mockResolvedValue({});
  });

  describe('deliverUserReport', () => {
    it('sends formatted report via WhatsApp', async () => {
      const mockReport = {
        id: 'report-1',
        releaseState: 'user_delivery_ready',
        user: { id: 'user-1', phone: '972501234567' },
        contentJson: {
          sections: [
            { id: 's1', titleHe: 'סיכום', contentHe: 'תוכן' },
          ],
          recommendations: [],
          generatedAt: new Date(),
        },
      };

      mockFn(prisma, 'reportObject', 'findUniqueOrThrow').mockResolvedValue(mockReport);
      mockFn(prisma, 'reportObject', 'update').mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) =>
        Promise.resolve({ id: where.id, ...data })
      );

      await service.deliverUserReport('report-1');

      const { sendTextMessage, sendInteractiveButtons } = await import('../../src/core/whatsapp/client');
      // Summary + 1 section + feedback buttons
      expect(sendTextMessage).toHaveBeenCalled();
      expect(sendInteractiveButtons).toHaveBeenCalled();
    });
  });

  describe('deliverEmployerReport', () => {
    it('generates secure link for employer report', async () => {
      // Track state through transitions
      let currentState = 'user_approved_employer_sharing';
      mockFn(prisma, 'reportObject', 'findUniqueOrThrow').mockImplementation(() =>
        Promise.resolve({
          id: 'report-2',
          releaseState: currentState,
          user: { id: 'user-1', phone: '972501234567' },
          contentJson: {
            sections: [{ id: 's1', titleHe: 'מטרה', contentHe: 'תוכן' }],
            recommendations: [],
            generatedAt: new Date(),
          },
        })
      );
      mockFn(prisma, 'reportObject', 'update').mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        currentState = data.releaseState as string;
        return Promise.resolve({ id: where.id, ...data });
      });

      const result = await service.deliverEmployerReport('report-2', 'secure_link');

      expect(result.url).toContain('test-token');
    });
  });
});
