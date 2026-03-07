import { PrismaClient } from '@prisma/client';
import { CaseProfile } from '../core/engine/case-profiler';
import { PackagedOutput } from '../core/engine/packager';
import { generateUserReport, UserReport } from '../core/reports/user-report';
import { generateEmployerReport, EmployerReport } from '../core/reports/employer-report';
import { generateOrgSignal, OrgSignalReport } from '../core/reports/org-signal';
import { applyDisclosureFilter } from '../core/reports/disclosure-filter';
import { outputReleaseStateMachine, ReleaseEvent } from '../core/state-machines/output-release';
import { AuditLogger } from '../core/audit/logger';
import { Audience, ReleaseState, ReportType } from '../core/types/enums';

export class ReportService {
  private auditLogger: AuditLogger;

  constructor(private prisma: PrismaClient) {
    this.auditLogger = new AuditLogger(prisma);
  }

  async generateReports(
    profile: CaseProfile,
    output: PackagedOutput
  ): Promise<{
    userReport: UserReport;
    employerReport: EmployerReport | null;
    orgSignal: OrgSignalReport;
    reportIds: { user: string; employer?: string; org: string };
  }> {
    // Generate user report
    const userReport = generateUserReport(
      profile,
      output.userRecommendations,
      output.employerRecommendations
    );

    // Apply disclosure filter for employer report
    const employerFiltered = applyDisclosureFilter(
      output.employerRecommendations,
      Audience.EMPLOYER,
      profile
    );

    // Generate employer report (independently, NOT from user report)
    const employerReport = generateEmployerReport(profile, employerFiltered.allowed);

    // Generate anonymous org signal
    const orgSignal = generateOrgSignal(profile, output.orgRecommendations);

    // Persist reports
    const userReportObj = await this.prisma.reportObject.create({
      data: {
        userId: profile.userId,
        type: 'user' as never,
        releaseState: 'draft_generated' as never,
        contentJson: userReport as never,
        version: 1,
      },
    });

    let employerReportId: string | undefined;
    if (employerReport) {
      const employerReportObj = await this.prisma.reportObject.create({
        data: {
          userId: profile.userId,
          type: 'employer' as never,
          releaseState: 'draft_generated' as never,
          contentJson: employerReport as never,
          version: 1,
        },
      });
      employerReportId = employerReportObj.id;
    }

    const orgReportObj = await this.prisma.reportObject.create({
      data: {
        userId: profile.userId,
        type: 'org_signal' as never,
        releaseState: 'draft_generated' as never,
        contentJson: orgSignal as never,
        version: 1,
      },
    });

    await this.auditLogger.log({
      entityType: 'ReportObject',
      entityId: userReportObj.id,
      action: 'generated',
      changeSummary: 'User report generated',
    });

    return {
      userReport,
      employerReport,
      orgSignal,
      reportIds: {
        user: userReportObj.id,
        employer: employerReportId,
        org: orgReportObj.id,
      },
    };
  }

  async transitionReport(reportId: string, event: ReleaseEvent, changedBy?: string) {
    const report = await this.prisma.reportObject.findUniqueOrThrow({
      where: { id: reportId },
    });

    const currentState = report.releaseState as never;
    const nextState = outputReleaseStateMachine.transition(currentState, event);

    const updateData: Record<string, unknown> = { releaseState: nextState };

    if (nextState === 'admin_edited_approved') {
      updateData.approvedAt = new Date();
      updateData.reviewedBy = changedBy;
    }
    if (['delivered_to_user', 'sent_to_employer'].includes(nextState)) {
      updateData.deliveredAt = new Date();
    }

    const updated = await this.prisma.reportObject.update({
      where: { id: reportId },
      data: updateData,
    });

    await this.auditLogger.logStateTransition(
      'ReportObject',
      reportId,
      report.releaseState,
      nextState,
      changedBy
    );

    return updated;
  }

  async approveReport(reportId: string, reviewerId: string, notes?: string) {
    await this.prisma.approvalObject.create({
      data: {
        reportId,
        reviewerId,
        action: 'approve' as never,
        notes,
      },
    });

    return this.transitionReport(reportId, 'approve', reviewerId);
  }

  async getUserReports(userId: string) {
    return this.prisma.reportObject.findMany({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async getReportsForReview() {
    return this.prisma.reportObject.findMany({
      where: { releaseState: 'admin_review_required' as never },
      include: { user: true },
      orderBy: { generatedAt: 'asc' },
    });
  }
}
