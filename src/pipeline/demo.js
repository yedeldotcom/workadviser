/**
 * Demo: Run the full WorkAdviser pipeline with a sample case.
 */

import { BARRIER_IDS } from '../engine1_intake/index.js';
import { runPipeline, runPipelineHebrew } from './index.js';

// Sample case: IDF veteran with hypervigilance + authority issues
const sampleResponses = {
  [BARRIER_IDS.FATIGUE]: 4,
  [BARRIER_IDS.MORNING_FUNCTIONING]: 3,
  [BARRIER_IDS.PROCRASTINATION]: 3,
  [BARRIER_IDS.SENSORY_DISCOMFORT]: 5,
  [BARRIER_IDS.AVOIDANCE]: 3,
  [BARRIER_IDS.IRRITABILITY]: 4,
  [BARRIER_IDS.ANXIETY_ATTACKS]: 4,
  [BARRIER_IDS.CONCENTRATION]: 3,
  [BARRIER_IDS.AUTHORITY]: 4,
  [BARRIER_IDS.MOTIVATION]: 2,
  [BARRIER_IDS.EMOTIONAL_REGULATION]: 4,
  [BARRIER_IDS.TIME_MANAGEMENT]: 2,
  [BARRIER_IDS.SELF_WORTH]: 3,
};

console.log('═══ WorkAdviser Pipeline Demo ═══\n');

// Run Hebrew summary
console.log(runPipelineHebrew({
  responses: sampleResponses,
  phase: 'early',
  orgReadiness: 'intermediate',
  audience: 'direct_manager',
}));

// Run full pipeline for JSON output
const fullResult = runPipeline({
  responses: sampleResponses,
  phase: 'early',
  orgReadiness: 'intermediate',
  audience: 'direct_manager',
});

console.log('\n═══ Summary (JSON) ═══');
console.log(JSON.stringify(fullResult.summary, null, 2));
