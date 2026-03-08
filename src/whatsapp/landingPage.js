/**
 * Landing Page — WorkAdviser pilot
 *
 * Returns a minimal Hebrew HTML page served at GET /.
 * Explains the service and shows a WhatsApp link + QR code placeholder.
 *
 * The phone number shown is controlled by WHATSAPP_DISPLAY_NUMBER env var.
 * QR code is generated client-side using the wa.me deep link.
 */

const WHATSAPP_NUMBER = process.env.WHATSAPP_DISPLAY_NUMBER ?? '+972-XX-XXX-XXXX';
const WA_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=%D7%94%D7%AA%D7%97%D7%9C`;

/**
 * Express handler — render the landing page HTML.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export function landingPageHandler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(buildHtml());
}

function buildHtml() {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WorkAdviser — ייעוץ נגישות תעסוקתית</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #f5f5f5;
      color: #1a1a1a;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 2.5rem 2rem;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      text-align: center;
    }
    .logo {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    h1 {
      font-size: 1.6rem;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 0.5rem;
    }
    .tagline {
      font-size: 1rem;
      color: #555;
      margin-bottom: 2rem;
      line-height: 1.6;
    }
    .steps {
      text-align: right;
      list-style: none;
      margin-bottom: 2rem;
      background: #f8f8f8;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
    }
    .steps li {
      padding: 0.4rem 0;
      font-size: 0.95rem;
      color: #333;
      line-height: 1.5;
    }
    .steps li::before {
      content: '✓ ';
      color: #25D366;
      font-weight: 700;
    }
    .cta {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #25D366;
      color: #fff;
      text-decoration: none;
      padding: 0.85rem 2rem;
      border-radius: 50px;
      font-size: 1.05rem;
      font-weight: 600;
      margin-bottom: 1rem;
      transition: background 0.15s;
    }
    .cta:hover { background: #1ebe59; }
    .phone-hint {
      font-size: 0.85rem;
      color: #888;
      margin-bottom: 2rem;
    }
    .disclaimer {
      font-size: 0.78rem;
      color: #aaa;
      line-height: 1.6;
      border-top: 1px solid #eee;
      padding-top: 1.25rem;
      margin-top: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🤝</div>
    <h1>WorkAdviser</h1>
    <p class="tagline">
      ייעוץ נגישות תעסוקתית אישי —<br>
      מה מקשה עליך בעבודה ומה יכול לעזור.
    </p>

    <ul class="steps">
      <li>שיחה פרטית וקצרה בוואטסאפ</li>
      <li>שאלות על מה שמרגיש קשה בעבודה</li>
      <li>סיכום אישי עם המלצות מעשיות</li>
      <li>אפשרות (לא חובה) לשיתוף עם המעסיק</li>
    </ul>

    <a class="cta" href="${WA_LINK}" target="_blank" rel="noopener">
      <span>💬</span>
      התחל/י בוואטסאפ
    </a>

    <p class="phone-hint">
      מספר שירות: ${WHATSAPP_NUMBER}
    </p>

    <p class="disclaimer">
      המערכת אינה מחליפה טיפול, אבחון, או ייעוץ משפטי.<br>
      כל המידע נשמר בצורה מאובטחת ולא משותף ללא אישורך.<br>
      פיילוט — Natal Israel 2026
    </p>
  </div>
</body>
</html>`;
}
