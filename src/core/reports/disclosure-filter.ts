import { DisclosureLevel, Audience } from '../types/enums';
import { PackagedRecommendation } from '../engine/packager';
import { CaseProfile } from '../engine/case-profiler';

export interface DisclosureFilterResult {
  allowed: PackagedRecommendation[];
  filtered: PackagedRecommendation[];
  filterReason: string;
}

export function applyDisclosureFilter(
  recommendations: PackagedRecommendation[],
  audience: Audience,
  profile: CaseProfile
): DisclosureFilterResult {
  if (audience === Audience.USER) {
    return {
      allowed: recommendations,
      filtered: [],
      filterReason: 'User audience — no filtering applied',
    };
  }

  if (profile.disclosureLevel === DisclosureLevel.NONE) {
    return {
      allowed: [],
      filtered: recommendations,
      filterReason: 'Disclosure level is NONE — no employer-facing recommendations',
    };
  }

  if (audience === Audience.ORG) {
    // Org signal — strip personal details, keep general recommendations
    const orgSafe = recommendations.map((r) => ({
      ...r,
      tracePath: {
        ...r.tracePath,
        // Remove specific barrier matches from trace for org-level
        matchedBarriers: [],
      },
    }));
    return {
      allowed: orgSafe,
      filtered: [],
      filterReason: 'Org audience — personal trace details stripped',
    };
  }

  // Employer audience with functional disclosure — strip personal details from trace
  if (profile.disclosureLevel === DisclosureLevel.FUNCTIONAL) {
    const functional = recommendations.map((r) => ({
      ...r,
      tracePath: {
        ...r.tracePath,
        matchedBarriers: [],
        scoreDimensions: {},
      },
    }));
    return {
      allowed: functional,
      filtered: [],
      filterReason: 'Functional disclosure — barrier details stripped from trace',
    };
  }

  return {
    allowed: recommendations,
    filtered: [],
    filterReason: `Disclosure level ${profile.disclosureLevel} — full employer recommendations`,
  };
}

export interface BarrierSummary {
  functional: string;
  detailed?: string;
}

export function filterBarrierDescriptions(
  barriers: Array<{ category: string; description?: string }>,
  disclosureLevel: DisclosureLevel
): BarrierSummary[] {
  return barriers.map((b) => {
    if (disclosureLevel === DisclosureLevel.NONE) {
      return { functional: '' };
    }

    if (disclosureLevel === DisclosureLevel.FUNCTIONAL) {
      return {
        functional: getFunctionalDescription(b.category),
      };
    }

    return {
      functional: getFunctionalDescription(b.category),
      detailed: b.description,
    };
  });
}

function getFunctionalDescription(category: string): string {
  const descriptions: Record<string, string> = {
    uncertainty: 'קושי עם שינויים לא צפויים ואי-בהירות',
    overload: 'קושי עם עומס רב של משימות ודרישות',
    communication: 'קושי בתקשורת בסביבת העבודה',
    sensory_environment: 'רגישות לתנאי הסביבה הפיזית',
    schedule: 'קושי עם לוח זמנים קשיח',
    concentration: 'קושי בריכוז ממושך',
    trust: 'קושי עם תחושת ביטחון בסביבת העבודה',
    autonomy: 'קושי כשחסרה שליטה על תהליכי העבודה',
    social: 'קושי באינטראקציות חברתיות בעבודה',
    performance_pressure: 'קושי עם לחץ ביצועים',
  };
  return descriptions[category] ?? 'קושי תפקודי בסביבת העבודה';
}
