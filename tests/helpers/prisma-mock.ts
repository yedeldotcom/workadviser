import { vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

type MockModel = {
  create: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  findUniqueOrThrow: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
};

function createMockModel(): MockModel {
  return {
    create: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };
}

export function createMockPrisma() {
  return {
    user: createMockModel(),
    userProfile: createMockModel(),
    interviewSession: createMockModel(),
    message: createMockModel(),
    normalizedSignal: createMockModel(),
    barrier: createMockModel(),
    trigger: createMockModel(),
    workplaceAmplifier: createMockModel(),
    changeEvent: createMockModel(),
    recommendationTemplate: createMockModel(),
    recommendationFamily: createMockModel(),
    renderedRecommendation: createMockModel(),
    reportObject: createMockModel(),
    approvalObject: createMockModel(),
    leadObject: createMockModel(),
    auditLog: createMockModel(),
    ruleObject: createMockModel(),
    knowledgeItem: createMockModel(),
    knowledgeSource: createMockModel(),
  } as unknown as PrismaClient;
}

/**
 * Get the mock function for a specific model method.
 * Usage: mockFn(prisma, 'user', 'findUnique').mockResolvedValue(...)
 */
export function mockFn(
  prisma: PrismaClient,
  model: string,
  method: string
): ReturnType<typeof vi.fn> {
  return (prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>)[model][method];
}
