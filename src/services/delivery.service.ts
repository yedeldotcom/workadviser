import { PrismaClient } from '@prisma/client';
import { ReportService } from './report.service';
import { sendTextMessage, sendInteractiveButtons } from '../core/whatsapp/client';
import {
  formatUserReportForWhatsApp,
  formatReportSummary,
  formatEmployerReportForWhatsApp,
} from '../core/reports/formatter';
import type { UserReport } from '../core/reports/user-report';
import type { EmployerReport } from '../core/reports/employer-report';
import { AuditLogger } from '../core/audit/logger';
import { generateSecureReportLink } from '../core/reports/secure-link';

export class DeliveryService {
  private reportService: ReportService;
  private auditLogger: AuditLogger;

  constructor(private prisma: PrismaClient) {
    this.reportService = new ReportService(prisma);
    this.auditLogger = new AuditLogger(prisma);
  }

  /**
   * Delivers a user report via WhatsApp.
   * Transitions report state through delivery flow.
   */
  async deliverUserReport(reportId: string): Promise<void> {
    const report = await this.prisma.reportObject.findUniqueOrThrow({
      where: { id: reportId },
      include: { user: true },
    });

    const phone = report.user.phone;
    if (!phone) {
      throw new Error('User has no phone number for delivery');
    }

    const userReport = report.contentJson as unknown as UserReport;

    // Send summary first
    const summary = formatReportSummary(userReport);
    await sendTextMessage(phone, summary);

    // Send each section
    const messages = formatUserReportForWhatsApp(userReport);
    for (const msg of messages) {
      await sendTextMessage(phone, msg.text);
    }

    // Transition to delivered
    await this.reportService.transitionReport(reportId, 'deliver_to_user', 'system');

    // Ask for feedback
    await sendInteractiveButtons(phone, 'האם הדוח ברור ומועיל?', [
      { id: 'report_clear', title: 'כן, ברור' },
      { id: 'report_unclear', title: 'יש שאלות' },
    ]);

    await this.auditLogger.log({
      entityType: 'ReportObject',
      entityId: reportId,
      action: 'delivered_via_whatsapp',
      changeSummary: `Delivered user report to ${phone}`,
    });
  }

  /**
   * Called after admin approves a report.
   * Transitions to delivery-ready and triggers delivery.
   */
  async onAdminApprove(reportId: string): Promise<void> {
    // Transition: admin_edited_approved → user_delivery_ready
    await this.reportService.transitionReport(reportId, 'mark_ready_for_user', 'system');

    // Auto-deliver
    await this.deliverUserReport(reportId);
  }

  /**
   * Delivers an employer report via secure link.
   */
  async deliverEmployerReport(
    reportId: string,
    method: 'whatsapp' | 'secure_link' = 'secure_link'
  ): Promise<{ url?: string }> {
    const report = await this.prisma.reportObject.findUniqueOrThrow({
      where: { id: reportId },
      include: { user: true },
    });

    if (method === 'secure_link') {
      const link = generateSecureReportLink(reportId);

      // Transition: user_approved_employer_sharing → employer_delivery_ready → sent_to_employer
      await this.reportService.transitionReport(reportId, 'mark_ready_for_employer', 'system');
      await this.reportService.transitionReport(reportId, 'send_to_employer', 'system');

      await this.auditLogger.log({
        entityType: 'ReportObject',
        entityId: reportId,
        action: 'employer_link_generated',
        changeSummary: `Secure link generated, expires ${link.expiresAt.toISOString()}`,
      });

      return { url: link.url };
    }

    // WhatsApp delivery for employer
    const phone = report.user.phone;
    if (!phone) throw new Error('No phone for employer delivery');

    const employerReport = report.contentJson as unknown as EmployerReport;
    const messages = formatEmployerReportForWhatsApp(employerReport);

    await this.reportService.transitionReport(reportId, 'mark_ready_for_employer', 'system');

    for (const msg of messages) {
      await sendTextMessage(phone, msg.text);
    }

    await this.reportService.transitionReport(reportId, 'send_to_employer', 'system');

    return {};
  }
}
