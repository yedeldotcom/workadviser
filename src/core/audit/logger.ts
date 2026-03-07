import { PrismaClient } from '@prisma/client';

export interface AuditEntry {
  entityType: string;
  entityId: string;
  action: string;
  changedBy?: string;
  changeSummary?: string;
  meaningChanged?: boolean;
  reusable?: boolean;
}

export class AuditLogger {
  constructor(private prisma: PrismaClient) {}

  async log(entry: AuditEntry) {
    return this.prisma.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        changedBy: entry.changedBy,
        changeSummary: entry.changeSummary,
        meaningChanged: entry.meaningChanged ?? false,
        reusable: entry.reusable ?? false,
      },
    });
  }

  async logStateTransition(
    entityType: string,
    entityId: string,
    fromState: string,
    toState: string,
    changedBy?: string
  ) {
    return this.log({
      entityType,
      entityId,
      action: 'state_transition',
      changeSummary: `${fromState} → ${toState}`,
      changedBy,
    });
  }

  async logRecommendationTrace(
    recommendationId: string,
    tracePath: Record<string, unknown>
  ) {
    return this.log({
      entityType: 'RenderedRecommendation',
      entityId: recommendationId,
      action: 'trace_recorded',
      changeSummary: JSON.stringify(tracePath),
    });
  }

  async getAuditTrail(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
