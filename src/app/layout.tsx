import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'נגישות תעסוקתית | PTSD Workplace Accessibility',
  description: 'מערכת לזיהוי חסמים תעסוקתיים והפקת המלצות מותאמות לאנשים עם פוסט-טראומה',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
