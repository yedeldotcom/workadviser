import { RecommendationTemplate } from '@prisma/client';
import { KnowledgeRepository, TemplateQuery } from '../knowledge/repository';
import { CaseProfile } from './case-profiler';
import { RecommendationLifecycle } from '../types/enums';

export interface RetrievalResult {
  templates: RecommendationTemplate[];
  query: TemplateQuery;
}

export async function retrieveCandidates(
  profile: CaseProfile,
  repo: KnowledgeRepository
): Promise<RetrievalResult> {
  const query: TemplateQuery = {
    barrierTags: profile.barrierCategories,
    employmentStage: profile.employmentStage,
    workplaceType: profile.workplaceType,
    disclosureLevel: profile.disclosureLevel,
    lifecycleStates: [
      RecommendationLifecycle.ACTIVE,
      RecommendationLifecycle.MONITORED,
      RecommendationLifecycle.EXPERIMENTAL,
    ],
  };

  const templates = await repo.getRecommendationTemplates(query);

  await repo.incrementRetrievalCount(templates.map((t) => t.id));

  return { templates, query };
}
