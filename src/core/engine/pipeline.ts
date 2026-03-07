import { PrismaClient } from '@prisma/client';
import { KnowledgeRepository } from '../knowledge/repository';
import { CaseProfile, CaseProfileInput, buildCaseProfile } from './case-profiler';
import { retrieveCandidates } from './candidate-retriever';
import { filterEligible, EligibilityResult } from './eligibility-gate';
import { scoreAndRank, ScoredTemplate } from './scorer';
import { deduplicateAndDiversify, DeduplicationResult } from './deduplicator';
import { packageRecommendations, PackagedOutput } from './packager';
import { assessConfidence, FallbackAction } from './confidence';

export interface PipelineResult {
  profile: CaseProfile;
  candidateCount: number;
  eligibleCount: number;
  scoredCount: number;
  deduplication: DeduplicationResult;
  output: PackagedOutput;
  confidence: FallbackAction;
  traceLog: PipelineTraceLog;
}

export interface PipelineTraceLog {
  profileSummary: {
    barriers: string[];
    triggers: string[];
    employmentStage: string;
    disclosureLevel: string;
    workplaceType?: string;
  };
  candidatesRetrieved: number;
  eligibilityResults: {
    eligible: number;
    ineligible: number;
    failedCriteria: Record<string, number>;
  };
  topScored: Array<{
    refId: string;
    score: number;
    family: string;
  }>;
  finalSelection: string[];
}

export interface PipelineOptions {
  topN?: number;
  maxPerFamily?: number;
  maxCandidates?: number;
}

export async function runRecommendationPipeline(
  input: CaseProfileInput,
  prisma: PrismaClient,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const topN = options.topN ?? 3;
  const maxPerFamily = options.maxPerFamily ?? 2;
  const maxCandidates = options.maxCandidates ?? 6;

  const repo = new KnowledgeRepository(prisma);

  // Step 1: Build case profile
  const profile = buildCaseProfile(input);

  // Step 2: Retrieve candidates
  const { templates } = await retrieveCandidates(profile, repo);

  // Step 3: Eligibility gating
  const { eligible, ineligible } = filterEligible(templates, profile);

  // Step 4: Score and rank
  const scored = scoreAndRank(
    eligible.map((e) => e.template),
    profile
  );

  // Step 5: Deduplicate and diversify
  const deduplication = deduplicateAndDiversify(scored, maxPerFamily, maxCandidates);

  // Step 6: Package by audience
  const output = packageRecommendations(deduplication.selected, profile, topN);

  // Step 7: Assess confidence
  const confidence = assessConfidence(output, profile);

  // Build trace log
  const failedCriteria: Record<string, number> = {};
  for (const item of ineligible) {
    for (const criterion of item.failedCriteria) {
      failedCriteria[criterion] = (failedCriteria[criterion] ?? 0) + 1;
    }
  }

  const traceLog: PipelineTraceLog = {
    profileSummary: {
      barriers: profile.barrierCategories,
      triggers: profile.triggerCategories,
      employmentStage: profile.employmentStage,
      disclosureLevel: profile.disclosureLevel,
      workplaceType: profile.workplaceType,
    },
    candidatesRetrieved: templates.length,
    eligibilityResults: {
      eligible: eligible.length,
      ineligible: ineligible.length,
      failedCriteria,
    },
    topScored: scored.slice(0, 10).map((s) => ({
      refId: s.template.stableRefId,
      score: s.compositeScore,
      family: s.template.familyId,
    })),
    finalSelection: deduplication.selected.map((s) => s.template.stableRefId),
  };

  return {
    profile,
    candidateCount: templates.length,
    eligibleCount: eligible.length,
    scoredCount: scored.length,
    deduplication,
    output,
    confidence,
    traceLog,
  };
}
