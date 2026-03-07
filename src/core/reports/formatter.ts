import type { UserReport, UserReportSection } from './user-report';
import type { EmployerReport, EmployerReportSection } from './employer-report';

const MAX_MESSAGE_LENGTH = 4096;

export interface WhatsAppReportMessage {
  text: string;
}

/**
 * Formats a user report for delivery via WhatsApp.
 * Each section becomes one or more messages, respecting the 4096-char limit.
 */
export function formatUserReportForWhatsApp(report: UserReport): WhatsAppReportMessage[] {
  const messages: WhatsAppReportMessage[] = [];

  for (const section of report.sections) {
    const formatted = formatSection(section.titleHe, section.contentHe);
    messages.push(...splitIntoMessages(formatted));
  }

  return messages;
}

/**
 * Creates a short summary message for initial delivery.
 */
export function formatReportSummary(report: UserReport): string {
  const recCount = report.recommendations.length;
  const sectionCount = report.sections.length;
  return `הדוח שלך מוכן!\n\nזיהינו ${recCount} המלצות מותאמות עבורך.\nהדוח כולל ${sectionCount} חלקים — נשלח אותם עכשיו.`;
}

/**
 * Formats an employer report for WhatsApp delivery.
 */
export function formatEmployerReportForWhatsApp(report: EmployerReport): WhatsAppReportMessage[] {
  const messages: WhatsAppReportMessage[] = [];

  for (const section of report.sections) {
    const formatted = formatSection(section.titleHe, section.contentHe);
    messages.push(...splitIntoMessages(formatted));
  }

  return messages;
}

function formatSection(title: string, content: string): string {
  return `*${title}*\n\n${content}`;
}

function splitIntoMessages(text: string): WhatsAppReportMessage[] {
  if (text.length <= MAX_MESSAGE_LENGTH) {
    return [{ text }];
  }

  const messages: WhatsAppReportMessage[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_MESSAGE_LENGTH) {
      messages.push({ text: remaining });
      break;
    }

    // Find a good split point (newline near the limit)
    let splitAt = remaining.lastIndexOf('\n', MAX_MESSAGE_LENGTH);
    if (splitAt < MAX_MESSAGE_LENGTH * 0.5) {
      // No good newline found, split at space
      splitAt = remaining.lastIndexOf(' ', MAX_MESSAGE_LENGTH);
    }
    if (splitAt <= 0) {
      splitAt = MAX_MESSAGE_LENGTH;
    }

    messages.push({ text: remaining.slice(0, splitAt) });
    remaining = remaining.slice(splitAt).trimStart();
  }

  return messages;
}
