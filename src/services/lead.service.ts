import { PrismaClient } from '@prisma/client';
import { CaseProfile } from '../core/engine/case-profiler';
import { detectLectureOpportunity, LeadManager, LeadSignal } from '../core/leads/detector';
import { AuditLogger } from '../core/audit/logger';

export interface ExportableLeadData {
  orgName?: string;
  contactPerson?: string;
  contactChannel?: string;
  orgType?: string;
  lectureAngle?: string;
  reason: string;
  leadId: string;
  consentStatus: string;
  exportTimestamp?: Date;
}

export class LeadService {
  private leadManager: LeadManager;
  private auditLogger: AuditLogger;

  constructor(private prisma: PrismaClient) {
    this.leadManager = new LeadManager(prisma);
    this.auditLogger = new AuditLogger(prisma);
  }

  async evaluateAndCreateLead(
    profile: CaseProfile,
    orgInfo?: { orgName?: string; contactPerson?: string; contactChannel?: string }
  ): Promise<{ signal: LeadSignal; leadId?: string }> {
    const signal = detectLectureOpportunity(profile);

    if (!signal.detected) {
      return { signal };
    }

    const lead = await this.leadManager.createLead(profile.userId, signal, orgInfo);

    if (lead) {
      await this.auditLogger.log({
        entityType: 'LeadObject',
        entityId: lead.id,
        action: 'lead_detected',
        changeSummary: signal.reason,
      });
    }

    return { signal, leadId: lead?.id };
  }

  async getExportableLeads(): Promise<ExportableLeadData[]> {
    const leads = await this.leadManager.getExportableLeads();

    return leads.map((lead) => ({
      orgName: lead.orgName ?? undefined,
      contactPerson: lead.contactPerson ?? undefined,
      contactChannel: lead.contactChannel ?? undefined,
      orgType: lead.orgType ?? undefined,
      lectureAngle: lead.lectureAngle ?? undefined,
      reason: lead.reason,
      leadId: lead.id,
      consentStatus: lead.consentStatus,
      exportTimestamp: lead.exportedAt ?? undefined,
    }));
  }

  async exportLead(leadId: string) {
    const result = await this.leadManager.transitionLead(leadId, 'export');

    await this.auditLogger.log({
      entityType: 'LeadObject',
      entityId: leadId,
      action: 'lead_exported',
      changeSummary: `Exported at ${new Date().toISOString()}`,
    });

    return result;
  }
}
