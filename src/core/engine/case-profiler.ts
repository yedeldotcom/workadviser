import {
  EmploymentStage,
  WorkplaceType,
  DisclosureLevel,
  ConfidenceLevel,
} from '../types/enums';

export interface DetectedBarrier {
  category: string;
  severity?: number;
  confidence: ConfidenceLevel;
}

export interface DetectedTrigger {
  category: string;
  contextDescription?: string;
  confidence: ConfidenceLevel;
}

export interface DetectedAmplifier {
  category: string;
  description?: string;
  confidence: ConfidenceLevel;
}

export interface ChangeEventInfo {
  eventType: string;
  description?: string;
  revalidationLevel: string;
}

export interface CaseProfile {
  userId: string;
  employmentStage: EmploymentStage;
  workplaceType?: WorkplaceType;
  jobTitle?: string;
  disclosureLevel: DisclosureLevel;
  barriers: DetectedBarrier[];
  triggers: DetectedTrigger[];
  amplifiers: DetectedAmplifier[];
  changeEvents: ChangeEventInfo[];
  barrierCategories: string[];
  triggerCategories: string[];
  hasActiveChangeEvent: boolean;
}

export interface CaseProfileInput {
  userId: string;
  employmentStage?: EmploymentStage;
  workplaceType?: WorkplaceType;
  jobTitle?: string;
  disclosureLevel?: DisclosureLevel;
  barriers: DetectedBarrier[];
  triggers: DetectedTrigger[];
  amplifiers: DetectedAmplifier[];
  changeEvents: ChangeEventInfo[];
}

export function buildCaseProfile(input: CaseProfileInput): CaseProfile {
  const barriers = input.barriers.filter(
    (b) => b.confidence !== ConfidenceLevel.LOW
  );
  const triggers = input.triggers.filter(
    (t) => t.confidence !== ConfidenceLevel.LOW
  );

  return {
    userId: input.userId,
    employmentStage: input.employmentStage ?? EmploymentStage.ACTIVE_EMPLOYMENT,
    workplaceType: input.workplaceType,
    jobTitle: input.jobTitle,
    disclosureLevel: input.disclosureLevel ?? DisclosureLevel.NONE,
    barriers,
    triggers,
    amplifiers: input.amplifiers,
    changeEvents: input.changeEvents,
    barrierCategories: [...new Set(barriers.map((b) => b.category))],
    triggerCategories: [...new Set(triggers.map((t) => t.category))],
    hasActiveChangeEvent: input.changeEvents.length > 0,
  };
}
