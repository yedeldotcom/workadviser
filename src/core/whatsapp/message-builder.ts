import type { InterviewQuestion } from '../interview/branching';
import type { DistressSignal } from '../interview/distress';
import {
  sendTextMessage,
  sendInteractiveButtons,
  sendInteractiveList,
  type ButtonReply,
  type WhatsAppResponse,
} from './client';

/**
 * Sends an interview question via WhatsApp, choosing the correct
 * interactive format based on the number of quick replies.
 */
export async function sendQuestionMessage(
  phone: string,
  question: InterviewQuestion
): Promise<WhatsAppResponse> {
  if (!question.quickReplies || question.quickReplies.length === 0) {
    return sendTextMessage(phone, question.textHe);
  }

  if (question.quickReplies.length <= 3) {
    const buttons: ButtonReply[] = question.quickReplies.map((reply, i) => ({
      id: `${question.id}_${i}`,
      title: reply.slice(0, 20),
    }));
    return sendInteractiveButtons(phone, question.textHe, buttons);
  }

  // 4+ options → use list format
  return sendInteractiveList(phone, question.textHe, 'בחר/י', [
    {
      title: 'אפשרויות',
      rows: question.quickReplies.map((reply, i) => ({
        id: `${question.id}_${i}`,
        title: reply.slice(0, 24),
      })),
    },
  ]);
}

/**
 * Sends a distress response message via WhatsApp.
 */
export async function sendDistressResponse(
  phone: string,
  distress: DistressSignal
): Promise<WhatsAppResponse | null> {
  if (distress.action.type === 'stop_and_contain' || distress.action.type === 'offer_pause') {
    return sendTextMessage(phone, distress.action.messageHe);
  }
  return null;
}
