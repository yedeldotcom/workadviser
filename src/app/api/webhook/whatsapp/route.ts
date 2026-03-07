import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/client';
import { InterviewService } from '@/services/interview.service';
import { MessageType, MessageDirection } from '@/core/types/enums';
import { InterviewSessionManager } from '@/core/interview/session';
import { markAsRead } from '@/core/whatsapp/client';
import { sendQuestionMessage, sendDistressResponse } from '@/core/whatsapp/message-builder';
import { sendTextMessage, sendInteractiveButtons } from '@/core/whatsapp/client';
import { ConsentManager } from '@/core/consent/manager';
import { OrchestratorService } from '@/services/orchestrator.service';
import { DeliveryService } from '@/services/delivery.service';
import { buildAcknowledgment, buildTransitionMessage } from '@/core/interview/response-builder';

const interviewService = new InterviewService(prisma);
const sessionManager = new InterviewSessionManager(prisma);
const consentManager = new ConsentManager(prisma);
const orchestratorService = new OrchestratorService(prisma);
const deliveryService = new DeliveryService(prisma);

// GET /api/webhook/whatsapp — webhook verification (WhatsApp Cloud API)
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST /api/webhook/whatsapp — incoming message from WhatsApp
export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (await request.json()) as any;

    // WhatsApp Cloud API message structure
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.length) {
      return NextResponse.json({ status: 'ok' });
    }

    const message = value.messages[0];
    const phone: string = message.from;
    const messageType: string = message.type;
    const incomingMessageId: string | undefined = message.id;

    // Acknowledge receipt
    if (incomingMessageId) {
      markAsRead(incomingMessageId).catch(() => {});
    }

    // Find or create user by phone
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          consentState: 'pending',
          profile: { create: {} },
        },
      });
    }

    // ── Consent gate ──
    if (consentManager.isConsentRequired(user)) {
      const consentReplies = consentManager.getConsentQuickReplies();
      const userText = extractContent(message, messageType).content;

      if (consentReplies.some((r) => userText.includes(r)) && userText.includes(consentReplies[0])) {
        // User agreed
        await consentManager.grantConsent(user.id);
        await sendTextMessage(phone, 'תודה! נתחיל. אפשר לעצור בכל שלב.');
      } else if (userText.includes(consentReplies[1])) {
        // User declined
        await sendTextMessage(phone, 'בסדר גמור. אפשר לפנות אלינו בכל עת. שמים את הפרטיות שלך בראש סדר העדיפויות.');
        return NextResponse.json({ status: 'ok', consent: 'declined' });
      } else {
        // First contact or unrecognized response — send consent message
        await consentManager.sendConsentRequest(phone);
        return NextResponse.json({ status: 'ok', consent: 'requested' });
      }
    }

    if (user.consentState === 'withdrawn') {
      await consentManager.sendConsentRequest(phone);
      return NextResponse.json({ status: 'ok', consent: 're_requested' });
    }

    // ── Interview flow ──
    const session = await interviewService.startSession(user.id);

    // Extract text content
    const { content, type } = extractContent(message, messageType);

    if (!content) {
      return NextResponse.json({ status: 'ok' });
    }

    // ── Handle report feedback responses ──
    const buttonId = message.interactive?.button_reply?.id;
    if (buttonId === 'report_clear' || buttonId === 'report_unclear') {
      if (buttonId === 'report_clear') {
        // Find user's delivered report and mark as viewed
        const deliveredReport = await prisma.reportObject.findFirst({
          where: { userId: user.id, type: 'user' as never, releaseState: 'delivered_to_user' as never },
          orderBy: { generatedAt: 'desc' },
        });
        if (deliveredReport) {
          const { ReportService } = await import('@/services/report.service');
          const reportService = new ReportService(prisma);
          await reportService.transitionReport(deliveredReport.id, 'user_view', 'user');
        }
        await sendTextMessage(phone, 'שמחנו לשמוע! אם תרצה/י לשתף את הדוח עם המעסיק, אפשר לעשות את זה בכל שלב.');
        await sendInteractiveButtons(phone, 'האם תרצה/י לשתף דוח מותאם עם המעסיק?', [
          { id: 'share_employer', title: 'כן, לשתף' },
          { id: 'share_later', title: 'אולי מאוחר יותר' },
        ]);
      } else {
        await sendTextMessage(phone, 'בסדר. אם יש שאלות ספציפיות, אפשר לשלוח אותן כאן ונחזור אליך.');
      }
      return NextResponse.json({ status: 'ok', processed: true });
    }

    // ── Handle employer sharing response ──
    if (buttonId === 'share_employer') {
      const employerReport = await prisma.reportObject.findFirst({
        where: { userId: user.id, type: 'employer' as never, releaseState: { not: 'withheld_cancelled' as never } },
        orderBy: { generatedAt: 'desc' },
      });
      if (employerReport) {
        const { ReportService } = await import('@/services/report.service');
        const reportService = new ReportService(prisma);
        // Transition through the sharing flow
        const viewedReport = await prisma.reportObject.findFirst({
          where: { userId: user.id, type: 'user' as never, releaseState: 'user_viewed' as never },
        });
        if (viewedReport) {
          await reportService.transitionReport(viewedReport.id, 'user_approve_employer_sharing', 'user');
        }
        const link = await deliveryService.deliverEmployerReport(employerReport.id, 'secure_link');
        if (link.url) {
          await sendTextMessage(phone, `הנה קישור מאובטח לדוח למעסיק:\n${link.url}\n\nהקישור תקף ל-7 ימים.`);
        }
      } else {
        await sendTextMessage(phone, 'לא נמצא דוח למעסיק. ייתכן שבחרת לא לשתף מידע עם המעסיק.');
      }
      return NextResponse.json({ status: 'ok', processed: true });
    }

    if (buttonId === 'share_later') {
      await sendTextMessage(phone, 'בסדר גמור. תוכל/י לפנות אלינו בכל עת.');
      return NextResponse.json({ status: 'ok', processed: true });
    }

    // ── Interview flow ──
    // Determine previous stage for transition detection
    const prevSession = await prisma.interviewSession.findUniqueOrThrow({
      where: { id: session.id },
      include: { messages: { where: { direction: 'inbound' }, select: { questionId: true } } },
    });
    const prevAnsweredIds = new Set(
      prevSession.messages.map((m: { questionId: string | null }) => m.questionId).filter(Boolean)
    );
    const prevStage = inferStageFromIds(prevAnsweredIds);

    // Process through interview service
    const result = await interviewService.processUserMessage(session.id, content, type);

    // Send distress response if needed
    if (result.distress.detected) {
      await sendDistressResponse(phone, result.distress);

      if (result.distress.level === 'severe') {
        return NextResponse.json({ status: 'ok', processed: true, distress: true });
      }
    }

    // Interview completed — trigger pipeline
    if (result.completed) {
      const completionMsg = 'תודה על השיחה! אנחנו מכינים עבורך דוח אישי עם המלצות מותאמות. נשלח אותו אליך בקרוב.';
      await sendTextMessage(phone, completionMsg);
      await sessionManager.addMessage({
        sessionId: session.id,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEXT,
        content: completionMsg,
      });

      // Run pipeline in background (don't block webhook response)
      orchestratorService.onInterviewComplete(session.id).catch((err) => {
        console.error('Pipeline error:', err);
      });

      return NextResponse.json({ status: 'ok', processed: true, completed: true });
    }

    // Generate conversational acknowledgment
    if (!result.distress.detected && content.length > 5) {
      const currentStage = inferStageFromIds(prevAnsweredIds);
      const ack = await buildAcknowledgment(content, currentStage);
      await sendTextMessage(phone, ack);
      await sessionManager.addMessage({
        sessionId: session.id,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEXT,
        content: ack,
      });
    }

    // Send general text response if provided (moderate distress)
    if (result.response && !result.distress.detected) {
      await sendTextMessage(phone, result.response);
      await sessionManager.addMessage({
        sessionId: session.id,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEXT,
        content: result.response,
      });
    }

    // Send stage transition message if stage changed
    const newStage = result.nextQuestions[0]?.stage ?? prevStage;
    if (newStage > prevStage) {
      const transitionMsg = buildTransitionMessage(prevStage, newStage);
      if (transitionMsg) {
        await sendTextMessage(phone, transitionMsg);
        await sessionManager.addMessage({
          sessionId: session.id,
          direction: MessageDirection.OUTBOUND,
          type: MessageType.TEXT,
          content: transitionMsg,
        });
      }
    }

    // Send next questions
    for (const question of result.nextQuestions) {
      await sendQuestionMessage(phone, question);
      await sessionManager.addMessage({
        sessionId: session.id,
        direction: MessageDirection.OUTBOUND,
        type: question.quickReplies?.length ? MessageType.QUICK_REPLY : MessageType.TEXT,
        content: question.textHe,
        questionId: question.id,
      });
    }

    return NextResponse.json({ status: 'ok', processed: true });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    // Always return 200 to WhatsApp to prevent retries
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}

function inferStageFromIds(answeredIds: Set<string | null>): number {
  const prefixes = ['onb_', 'emp_', 'bar_', 'trg_', 'dis_', 'cls_'];
  for (let i = prefixes.length - 1; i >= 0; i--) {
    if ([...answeredIds].some((id) => id?.startsWith(prefixes[i]))) {
      return Math.min(i + 2, 6);
    }
  }
  return 1;
}

function extractContent(
  message: { text?: { body?: string }; interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } }; type?: string },
  messageType: string
): { content: string; type: MessageType } {
  if (messageType === 'text') {
    return { content: message.text?.body ?? '', type: MessageType.TEXT };
  }
  if (messageType === 'interactive') {
    const content = message.interactive?.button_reply?.title ??
      message.interactive?.list_reply?.title ?? '';
    return { content, type: MessageType.QUICK_REPLY };
  }
  if (messageType === 'audio') {
    return { content: '[הודעה קולית — נדרש תמלול]', type: MessageType.VOICE };
  }
  return { content: `[${messageType} message]`, type: MessageType.TEXT };
}
