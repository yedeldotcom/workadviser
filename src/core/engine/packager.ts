import { ScoredTemplate } from './scorer';
import { CaseProfile } from './case-profiler';
import { Audience, ActorType, DisclosureLevel } from '../types/enums';

export interface PackagedRecommendation {
  templateId: string;
  stableRefId: string;
  familyId: string;
  audience: Audience;
  actorTags: string[];
  timeHorizon: string;
  contentHe: string;
  score: number;
  tracePath: TracePath;
}

export interface TracePath {
  templateRefId: string;
  barrierTags: string[];
  matchedBarriers: string[];
  employmentStage: string;
  disclosureLevel: string;
  score: number;
  scoreDimensions: Record<string, number>;
}

export interface PackagedOutput {
  userRecommendations: PackagedRecommendation[];
  employerRecommendations: PackagedRecommendation[];
  orgRecommendations: PackagedRecommendation[];
}

const USER_ACTORS = new Set([ActorType.USER_SELF, ActorType.USER_COMMUNICATION]);
const EMPLOYER_ACTORS = new Set([ActorType.MANAGER, ActorType.HR_ORGANIZATIONAL]);

export function packageRecommendations(
  selected: ScoredTemplate[],
  profile: CaseProfile,
  topN: number = 3
): PackagedOutput {
  const all = selected.map((s) => toPackaged(s, profile));

  const userRecs = all
    .filter((r) => r.actorTags.some((a) => USER_ACTORS.has(a as ActorType)))
    .slice(0, topN);

  const employerRecs = applyDisclosureFilter(
    all.filter((r) => r.actorTags.some((a) => EMPLOYER_ACTORS.has(a as ActorType))),
    profile.disclosureLevel
  ).slice(0, topN);

  const orgRecs = all
    .filter((r) => r.actorTags.some((a) => EMPLOYER_ACTORS.has(a as ActorType)))
    .slice(0, topN);

  return {
    userRecommendations: userRecs.map((r) => ({ ...r, audience: Audience.USER })),
    employerRecommendations: employerRecs.map((r) => ({ ...r, audience: Audience.EMPLOYER })),
    orgRecommendations: orgRecs.map((r) => ({ ...r, audience: Audience.ORG })),
  };
}

function toPackaged(scored: ScoredTemplate, profile: CaseProfile): PackagedRecommendation {
  return {
    templateId: scored.template.id,
    stableRefId: scored.template.stableRefId,
    familyId: scored.template.familyId,
    audience: Audience.USER,
    actorTags: scored.template.actorTags,
    timeHorizon: scored.template.timeHorizon,
    contentHe: scored.template.contentHe,
    score: scored.compositeScore,
    tracePath: {
      templateRefId: scored.template.stableRefId,
      barrierTags: scored.template.barrierTags,
      matchedBarriers: scored.template.barrierTags.filter((tag) =>
        profile.barrierCategories.includes(tag)
      ),
      employmentStage: profile.employmentStage,
      disclosureLevel: profile.disclosureLevel,
      score: scored.compositeScore,
      scoreDimensions: scored.scores as unknown as Record<string, number>,
    },
  };
}

function applyDisclosureFilter(
  recs: PackagedRecommendation[],
  disclosureLevel: DisclosureLevel
): PackagedRecommendation[] {
  if (disclosureLevel === DisclosureLevel.NONE) {
    return [];
  }
  return recs;
}
