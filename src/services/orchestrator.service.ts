import { PrismaClient } from '@prisma/client';
import { RecommendationService } from './recommendation.service';
import { ReportService } from './report.service';
import { buildCaseProfile, CaseProfileInput } from '../core/engine/case-profiler';
import { EmploymentStage, DisclosureLevel, ConfidenceLevel } from '../core/types/enums';
import { AuditLogger } from '../core/audit/logger';

export class OrchestratorService {
  private recommendationService: RecommendationService;
  private reportService: ReportService;
  private auditLogger: AuditLogger;

  constructor(private prisma: PrismaClient) {
    this.recommendationService = new RecommendationService(prisma);
    this.reportService = new ReportService(prisma);
    this.auditLogger = new AuditLogger(prisma);
  }

  /**
   * Runs the full post-interview pipeline:
   * 1. Load user profile + detected signals
   * 2. Build case profile
   * 3. Run recommendation pipeline
   * 4. Generate reports
   * 5. Submit reports for admin review
   */
  async onInterviewComplete(sessionId: string): Promise<{
    reportIds: { user: string; employer?: string; org: string };
  }> {
    const session = await this.prisma.interviewSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { user: { include: { profile: true } } },
    });

    const userId = session.userId;

    // Load detected signals from this session
    const [barriers, triggers, amplifiers] = await Promise.all([
      this.prisma.barrier.findMany({ where: { userId, sessionId } }),
      this.prisma.trigger.findMany({ where: { userId, sessionId } }),
      this.prisma.workplaceAmplifier.findMany({ where: { userId, sessionId } }),
    ]);

    // Load any active change events
    const changeEvents = await this.prisma.changeEvent.findMany({
      where: { userId, revalidationLevel: { in: ['full_reassessment', 'partial'] } },
    });

    // Build case profile input from detected signals
    const profileInput: CaseProfileInput = {
      userId,
      employmentStage: (session.user.profile?.employmentStage as EmploymentStage) ?? EmploymentStage.ACTIVE_EMPLOYMENT,
      disclosureLevel: (session.user.profile?.disclosureLevel as DisclosureLevel) ?? DisclosureLevel.NONE,
      barriers: barriers.map((b) => ({
        category: b.category,
        severity: b.severity ?? undefined,
        confidence: b.confidence as ConfidenceLevel,
      })),
      triggers: triggers.map((t) => ({
        category: t.category,
        confidence: t.confidence as ConfidenceLevel,
      })),
      amplifiers: amplifiers.map((a) => ({
        category: a.category,
        description: a.description ?? undefined,
        confidence: a.confidence as ConfidenceLevel,
      })),
      changeEvents: changeEvents.map((ce) => ({
        eventType: ce.eventType,
        description: ce.description ?? undefined,
        revalidationLevel: ce.revalidationLevel,
      })),
    };

    // Run recommendation pipeline
    const pipelineResult = await this.recommendationService.generateRecommendations(profileInput);

    // Build case profile for report generation
    const profile = buildCaseProfile(profileInput);

    // Generate reports
    const reportResult = await this.reportService.generateReports(profile, pipelineResult.output);

    // Submit reports for admin review
    const reportIds = [reportResult.reportIds.user, reportResult.reportIds.employer, reportResult.reportIds.org].filter(Boolean) as string[];
    for (const reportId of reportIds) {
      await this.reportService.transitionReport(reportId, 'submit_for_review', 'system');
    }

    await this.auditLogger.log({
      entityType: 'Pipeline',
      entityId: sessionId,
      action: 'post_interview_pipeline_complete',
      changeSummary: `Generated ${reportIds.length} reports from session ${sessionId}`,
    });

    return { reportIds: reportResult.reportIds };
  }
}
