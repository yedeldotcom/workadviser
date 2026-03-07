const API_VERSION = process.env.WHATSAPP_API_VERSION ?? 'v21.0';

function getBaseUrl(): string {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) throw new Error('WHATSAPP_PHONE_NUMBER_ID is not set');
  return `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
}

function getToken(): string {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) throw new Error('WHATSAPP_TOKEN is not set');
  return token;
}

export interface WhatsAppResponse {
  messaging_product: 'whatsapp';
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

export interface ButtonReply {
  id: string;
  title: string; // max 20 chars
}

export interface ListRow {
  id: string;
  title: string; // max 24 chars
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export class WhatsAppApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: number | undefined,
    message: string
  ) {
    super(message);
    this.name = 'WhatsAppApiError';
  }
}

async function sendRequest(body: Record<string, unknown>): Promise<WhatsAppResponse> {
  const response = await fetch(getBaseUrl(), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const waError = (errorBody as { error?: { code?: number; message?: string } }).error;
    throw new WhatsAppApiError(
      response.status,
      waError?.code,
      waError?.message ?? `WhatsApp API error: ${response.status}`
    );
  }

  return response.json() as Promise<WhatsAppResponse>;
}

export async function sendTextMessage(
  phone: string,
  text: string
): Promise<WhatsAppResponse> {
  return sendRequest({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: text.slice(0, 4096) },
  });
}

export async function sendInteractiveButtons(
  phone: string,
  body: string,
  buttons: ButtonReply[]
): Promise<WhatsAppResponse> {
  if (buttons.length > 3) {
    throw new Error('WhatsApp interactive buttons support max 3 buttons');
  }

  return sendRequest({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body.slice(0, 1024) },
      action: {
        buttons: buttons.map((b) => ({
          type: 'reply',
          reply: {
            id: b.id.slice(0, 256),
            title: b.title.slice(0, 20),
          },
        })),
      },
    },
  });
}

export async function sendInteractiveList(
  phone: string,
  body: string,
  buttonText: string,
  sections: ListSection[]
): Promise<WhatsAppResponse> {
  return sendRequest({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: body.slice(0, 1024) },
      action: {
        button: buttonText.slice(0, 20),
        sections: sections.map((s) => ({
          title: s.title.slice(0, 24),
          rows: s.rows.slice(0, 10).map((r) => ({
            id: r.id.slice(0, 200),
            title: r.title.slice(0, 24),
            description: r.description?.slice(0, 72),
          })),
        })),
      },
    },
  });
}

export async function markAsRead(messageId: string): Promise<void> {
  await sendRequest({
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  } as Record<string, unknown>);
}
