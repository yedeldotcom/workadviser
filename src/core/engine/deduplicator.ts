import { ScoredTemplate } from './scorer';

export interface DeduplicationResult {
  selected: ScoredTemplate[];
  dropped: ScoredTemplate[];
}

export function deduplicateAndDiversify(
  scored: ScoredTemplate[],
  maxPerFamily: number = 2,
  maxTotal: number = 6
): DeduplicationResult {
  const familyCounts = new Map<string, number>();
  const selected: ScoredTemplate[] = [];
  const dropped: ScoredTemplate[] = [];

  for (const item of scored) {
    const familyId = item.template.familyId;
    const currentCount = familyCounts.get(familyId) ?? 0;

    if (currentCount >= maxPerFamily) {
      dropped.push(item);
      continue;
    }

    if (selected.length >= maxTotal) {
      dropped.push(item);
      continue;
    }

    selected.push(item);
    familyCounts.set(familyId, currentCount + 1);
  }

  return { selected, dropped };
}
