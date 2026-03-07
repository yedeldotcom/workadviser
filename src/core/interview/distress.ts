export interface DistressSignal {
  detected: boolean;
  level: 'none' | 'mild' | 'moderate' | 'severe';
  indicators: string[];
  action: DistressAction;
}

export type DistressAction =
  | { type: 'continue' }
  | { type: 'reduce_depth' }
  | { type: 'offer_pause'; messageHe: string }
  | { type: 'stop_and_contain'; messageHe: string }
  | { type: 'escalate'; reason: string };

const DISTRESS_KEYWORDS = [
  'אני לא יכול',
  'אני לא מצליח',
  'קשה לי מדי',
  'אני בפאניקה',
  'אני מרגיש רע',
  'אני רוצה לעצור',
  'זה יותר מדי',
  'אני לא בסדר',
  'אני בוכה',
  'אני צריך עזרה',
  'חושב על לפגוע',
  'לא רוצה לחיות',
];

const SEVERE_KEYWORDS = ['חושב על לפגוע', 'לא רוצה לחיות', 'התאבדות'];

export function detectDistress(message: string): DistressSignal {
  const lowerMessage = message.toLowerCase();
  const indicators: string[] = [];

  for (const keyword of DISTRESS_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      indicators.push(keyword);
    }
  }

  const hasSevere = SEVERE_KEYWORDS.some((k) => lowerMessage.includes(k));

  if (hasSevere) {
    return {
      detected: true,
      level: 'severe',
      indicators,
      action: {
        type: 'stop_and_contain',
        messageHe:
          'אני שומע/ת אותך. מה שאת/ה מרגיש/ה חשוב. אנחנו עוצרים כאן את השיחה. אם את/ה במצוקה, אנא פנה/י לער"ן (עזרה ראשונה נפשית) בטלפון 1201, או למוקד החירום 112. אנחנו כאן ונחזור אליך כשתרגיש/י מוכן/ה.',
      },
    };
  }

  if (indicators.length >= 2) {
    return {
      detected: true,
      level: 'moderate',
      indicators,
      action: {
        type: 'offer_pause',
        messageHe:
          'נראה שזה לא פשוט עכשיו. אפשר לעצור ולהמשיך מאוחר יותר — הכל שמור. מה מתאים לך?',
      },
    };
  }

  if (indicators.length === 1) {
    return {
      detected: true,
      level: 'mild',
      indicators,
      action: { type: 'reduce_depth' },
    };
  }

  return {
    detected: false,
    level: 'none',
    indicators: [],
    action: { type: 'continue' },
  };
}
