import { PrismaClient } from '@prisma/client';
import { runRecommendationPipeline, PipelineResult } from '../core/engine/pipeline';
import { CaseProfileInput } from '../core/engine/case-profiler';
import { AuditLogger } from '../core/audit/logger';
import { ConfidenceLevel, Audience } from '../core/types/enums';

export class RecommendationService {
  private auditLogger: AuditLogger;

  constructor(private prisma: PrismaClient) {
    this.auditLogger = new AuditLogger(prisma);
  }

  async generateRecommendations(input: CaseProfileInput): Promise<PipelineResult> {
    const result = await runRecommendationPipeline(input, this.prisma);

    // Persist rendered recommendations
    const allRecs = [
      ...result.output.userRecommendations,
      ...result.output.employerRecommendations,
      ...result.output.orgRecommendations,
    ];

    for (const rec of allRecs) {
      const rendered = await this.prisma.renderedRecommendation.create({
        data: {
          templateId: rec.templateId,
          userId: input.userId,
          audience: rec.audience as never,
          renderedContentHe: rec.contentHe,
          tracePath: rec.tracePath as never,
          score: rec.score,
        },
      });

      await this.auditLogger.logRecommendationTrace(rendered.id, rec.tracePath as unknown as Record<string, unknown>);
    }

    // Increment inclusion counts
    const includedTemplateIds = [...new Set(allRecs.map((r) => r.templateId))];
    if (includedTemplateIds.length > 0) {
      await this.prisma.recommendationTemplate.updateMany({
        where: { id: { in: includedTemplateIds } },
        data: { inclusionCount: { increment: 1 } },
      });
    }

    await this.auditLogger.log({
      entityType: 'RecommendationPipeline',
      entityId: input.userId,
      action: 'pipeline_run',
      changeSummary: `Retrieved ${result.candidateCount}, eligible ${result.eligibleCount}, selected ${result.deduplication.selected.length}`,
    });

    return result;
  }

  async getRecommendationsForUser(userId: string) {
    return this.prisma.renderedRecommendation.findMany({
      where: { userId },
      include: { template: { include: { family: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
