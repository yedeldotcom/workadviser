import { PrismaClient } from '@prisma/client';
import { CaseProfile } from '../engine/case-profiler';
import { leadHandoffMachine } from '../state-machines/lead-handoff';

export interface LeadSignal {
  detected: boolean;
  reason?: string;
  lectureAngle?: string;
  orgType?: string;
}

export function detectLectureOpportunity(profile: CaseProfile): LeadSignal {
  // Only flag when there are clear organizational-level patterns
  // Do not force commercial escalation (spec rule)
  const orgLevelBarriers = profile.barriers.filter((b) =>
    ['communication', 'trust', 'autonomy', 'performance_pressure'].includes(b.category)
  );

  const hasMultipleOrgBarriers = orgLevelBarriers.length >= 2;
  const hasAmplifiers = profile.amplifiers.length >= 2;

  if (!hasMultipleOrgBarriers && !hasAmplifiers) {
    return { detected: false };
  }

  const barrierCategories = orgLevelBarriers.map((b) => b.category);
  let lectureAngle = 'נגישות תעסוקתית כללית';

  if (barrierCategories.includes('communication') && barrierCategories.includes('trust')) {
    lectureAngle = 'תקשורת ניהולית מותאמת ונגישות רגשית';
  } else if (barrierCategories.includes('performance_pressure')) {
    lectureAngle = 'ניהול ביצועים מותאם ונגישות תפקודית';
  }

  return {
    detected: true,
    reason: `זוהו ${orgLevelBarriers.length} חסמים ברמה ארגונית ו-${profile.amplifiers.length} מגברים`,
    lectureAngle,
    orgType: profile.workplaceType,
  };
}

export class LeadManager {
  constructor(private prisma: PrismaClient) {}

  async createLead(
    userId: string | undefined,
    signal: LeadSignal,
    orgInfo?: { orgName?: string; contactPerson?: string; contactChannel?: string }
  ) {
    if (!signal.detected || !signal.reason) return null;

    return this.prisma.leadObject.create({
      data: {
        userId,
        reason: signal.reason,
        lectureAngle: signal.lectureAngle,
        orgType: signal.orgType,
        orgName: orgInfo?.orgName,
        contactPerson: orgInfo?.contactPerson,
        contactChannel: orgInfo?.contactChannel,
        handoffState: 'detected',
      },
    });
  }

  async transitionLead(
    leadId: string,
    event: 'create_lead' | 'export' | 'confirm'
  ) {
    const lead = await this.prisma.leadObject.findUniqueOrThrow({
      where: { id: leadId },
    });

    const nextState = leadHandoffMachine.transition(
      lead.handoffState as 'detected' | 'lead_created' | 'exported' | 'confirmed',
      event
    );

    const updateData: Record<string, unknown> = { handoffState: nextState };
    if (nextState === 'exported') {
      updateData.exportedAt = new Date();
    }

    return this.prisma.leadObject.update({
      where: { id: leadId },
      data: updateData,
    });
  }

  async getExportableLeads() {
    return this.prisma.leadObject.findMany({
      where: { handoffState: 'lead_created' },
    });
  }
}
