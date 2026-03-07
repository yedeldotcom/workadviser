import { ConfidenceLevel } from '../types/enums';
import { PackagedOutput } from './packager';
import { CaseProfile } from './case-profiler';

export type FallbackAction =
  | { type: 'proceed'; confidence: ConfidenceLevel }
  | { type: 'clarify'; questions: string[] }
  | { type: 'low_confidence_set'; confidence: ConfidenceLevel }
  | { type: 'human_review'; reason: string }
  | { type: 'resource_only'; reason: string };

export function assessConfidence(
  output: PackagedOutput,
  profile: CaseProfile
): FallbackAction {
  const totalRecs =
    output.userRecommendations.length +
    output.employerRecommendations.length;

  // Safety-critical: check for escalate-level barriers first
  const escalateBarriers = profile.barriers.filter(
    (b) => b.confidence === ConfidenceLevel.ESCALATE
  );
  if (escalateBarriers.length > 0) {
    return {
      type: 'human_review',
      reason: `${escalateBarriers.length} barrier(s) flagged for escalation`,
    };
  }

  // No barriers detected — need clarification
  if (profile.barriers.length === 0) {
    return {
      type: 'clarify',
      questions: [
        'לא הצלחנו לזהות חסמים ספציפיים מהמידע שניתן. האם תוכל/י לתאר מה הכי מקשה עליך בעבודה?',
      ],
    };
  }

  // Very few recommendations found
  if (totalRecs === 0) {
    return {
      type: 'resource_only',
      reason: 'No matching recommendations found for the detected barriers and context',
    };
  }

  // Check average score
  const allScores = [
    ...output.userRecommendations,
    ...output.employerRecommendations,
  ].map((r) => r.score);
  const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;

  if (avgScore < 0.3) {
    return {
      type: 'low_confidence_set',
      confidence: ConfidenceLevel.LOW,
    };
  }

  if (avgScore < 0.5) {
    return {
      type: 'proceed',
      confidence: ConfidenceLevel.MEDIUM,
    };
  }

  return {
    type: 'proceed',
    confidence: ConfidenceLevel.HIGH,
  };
}
