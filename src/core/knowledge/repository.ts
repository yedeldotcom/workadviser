import { PrismaClient, RecommendationTemplate, KnowledgeItem } from '@prisma/client';
import {
  EmploymentStage,
  WorkplaceType,
  DisclosureLevel,
  ConfidenceLevel,
  RecommendationLifecycle,
} from '../types/enums';

export interface TemplateQuery {
  barrierTags?: string[];
  employmentStage?: EmploymentStage;
  workplaceType?: WorkplaceType;
  disclosureLevel?: DisclosureLevel;
  lifecycleStates?: RecommendationLifecycle[];
}

export class KnowledgeRepository {
  constructor(private prisma: PrismaClient) {}

  async getRecommendationTemplates(query: TemplateQuery): Promise<RecommendationTemplate[]> {
    const where: Record<string, unknown> = {};

    if (query.lifecycleStates && query.lifecycleStates.length > 0) {
      where.lifecycleState = { in: query.lifecycleStates };
    } else {
      where.lifecycleState = { in: ['active', 'monitored', 'experimental'] };
    }

    const templates = await this.prisma.recommendationTemplate.findMany({
      where,
      include: { family: true },
    });

    return templates.filter((t) => {
      if (query.barrierTags && query.barrierTags.length > 0) {
        const hasOverlap =
          t.barrierTags.length === 0 ||
          t.barrierTags.some((tag) => query.barrierTags!.includes(tag));
        if (!hasOverlap) return false;
      }

      if (query.employmentStage) {
        if (
          t.employmentStageTags.length > 0 &&
          !t.employmentStageTags.includes(query.employmentStage as never)
        ) {
          return false;
        }
      }

      if (query.workplaceType) {
        if (
          t.workplaceTypeTags.length > 0 &&
          !t.workplaceTypeTags.includes(query.workplaceType as never)
        ) {
          return false;
        }
      }

      if (query.disclosureLevel) {
        if (
          t.disclosureSuitability.length > 0 &&
          !t.disclosureSuitability.includes(query.disclosureLevel as never)
        ) {
          return false;
        }
      }

      return true;
    });
  }

  async getTemplateById(id: string): Promise<RecommendationTemplate | null> {
    return this.prisma.recommendationTemplate.findUnique({
      where: { id },
      include: { family: true },
    });
  }

  async getTemplateByRefId(stableRefId: string): Promise<RecommendationTemplate | null> {
    return this.prisma.recommendationTemplate.findUnique({
      where: { stableRefId },
      include: { family: true },
    });
  }

  async incrementRetrievalCount(templateIds: string[]): Promise<void> {
    await this.prisma.recommendationTemplate.updateMany({
      where: { id: { in: templateIds } },
      data: { retrievalCount: { increment: 1 } },
    });
  }

  async incrementInclusionCount(templateIds: string[]): Promise<void> {
    await this.prisma.recommendationTemplate.updateMany({
      where: { id: { in: templateIds } },
      data: { inclusionCount: { increment: 1 } },
    });
  }

  async getKnowledgeItems(type?: string): Promise<KnowledgeItem[]> {
    return this.prisma.knowledgeItem.findMany({
      where: type ? { type: type as never } : undefined,
      include: { source: true },
    });
  }

  async getFamilies() {
    return this.prisma.recommendationFamily.findMany({
      include: { templates: { select: { id: true, stableRefId: true, lifecycleState: true } } },
    });
  }
}
