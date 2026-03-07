import { PrismaClient, User } from '@prisma/client';
import { AuditLogger } from '../audit/logger';
import { sendInteractiveButtons } from '../whatsapp/client';
import type { ButtonReply } from '../whatsapp/client';

const CONSENT_MESSAGE = `שלום! אני כאן כדי לעזור לך להבין מה יכול להקל עליך בעבודה.

לפני שנתחיל, חשוב שתדע/י:
• אאסוף מידע על חסמים תעסוקתיים והקשר העבודה שלך
• המידע ישמש ליצירת המלצות מותאמות אישית עבורך
• תקבל/י דוח אישי — ודוח למעסיק רק אם תבחר/י לשתף
• אפשר לעצור ולמחוק את המידע בכל שלב
• המידע שלך מוגן ולא ישותף ללא הסכמתך

האם את/ה מסכים/ה להמשיך?`;

const CONSENT_REPLIES = ['מסכים/ה', 'לא כרגע'];

export class ConsentManager {
  private auditLogger: AuditLogger;

  constructor(private prisma: PrismaClient) {
    this.auditLogger = new AuditLogger(prisma);
  }

  isConsentRequired(user: Pick<User, 'consentState'>): boolean {
    return user.consentState === 'pending';
  }

  getConsentMessage(): string {
    return CONSENT_MESSAGE;
  }

  getConsentQuickReplies(): string[] {
    return CONSENT_REPLIES;
  }

  async sendConsentRequest(phone: string): Promise<void> {
    const buttons: ButtonReply[] = CONSENT_REPLIES.map((reply, i) => ({
      id: `consent_${i}`,
      title: reply,
    }));

    await sendInteractiveButtons(phone, CONSENT_MESSAGE, buttons);
  }

  async grantConsent(userId: string): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { consentState: 'granted' },
    });

    await this.auditLogger.log({
      entityType: 'User',
      entityId: userId,
      action: 'consent_granted',
      changeSummary: 'User granted consent for data collection and processing',
      changedBy: userId,
    });

    return user;
  }

  async withdrawConsent(userId: string): Promise<User> {
    // Pause any active sessions
    const activeSessions = await this.prisma.interviewSession.findMany({
      where: {
        userId,
        state: { in: ['onboarding', 'active'] },
      },
    });

    for (const session of activeSessions) {
      await this.prisma.interviewSession.update({
        where: { id: session.id },
        data: { state: 'paused', pausedAt: new Date() },
      });
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { consentState: 'withdrawn' },
    });

    await this.auditLogger.log({
      entityType: 'User',
      entityId: userId,
      action: 'consent_withdrawn',
      changeSummary: `User withdrew consent. ${activeSessions.length} sessions paused.`,
      changedBy: userId,
    });

    return user;
  }
}
