export default function LandingPage() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#1a1a2e' }}>
          נגישות תעסוקתית
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#555', maxWidth: 600, margin: '0 auto' }}>
          מערכת לזיהוי חסמים תעסוקתיים והפקת המלצות מותאמות לאנשים עם פוסט-טראומה בישראל
        </p>
      </header>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ color: '#1a1a2e', marginBottom: '1rem' }}>איך זה עובד?</h2>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <StepCard
            number={1}
            title="שיחה דרך וואטסאפ"
            description="שיחה מובנית ורגישה שעוזרת להבין מה מקשה עליך בעבודה"
          />
          <StepCard
            number={2}
            title="זיהוי חסמים והמלצות"
            description="המערכת מזהה חסמים תעסוקתיים ומייצרת המלצות מותאמות אישית"
          />
          <StepCard
            number={3}
            title="דוח אישי ודוח למעסיק"
            description="דוח עבורך ודוח נפרד למעסיק — רק אם ומתי שתחליט/י"
          />
        </div>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ color: '#1a1a2e', marginBottom: '1rem' }}>עקרונות המערכת</h2>
        <ul style={{ lineHeight: 2, color: '#333' }}>
          <li>שום מידע לא ישותף ללא אישור מפורש שלך</li>
          <li>המערכת לא מספקת אבחון, טיפול או ייעוץ משפטי</li>
          <li>הדוח למעסיק נבנה באופן עצמאי ומותאם לרמת השיתוף שבחרת</li>
          <li>ניתן לעצור את השיחה בכל שלב ולחזור מאוחר יותר</li>
        </ul>
      </section>

      <section style={{ textAlign: 'center', padding: '2rem', background: '#f0f4f8', borderRadius: 12 }}>
        <h2 style={{ marginBottom: '1rem', color: '#1a1a2e' }}>מוכנ/ה להתחיל?</h2>
        <p style={{ marginBottom: '1.5rem', color: '#555' }}>
          שלח/י הודעה למספר הוואטסאפ שלנו כדי להתחיל את השיחה
        </p>
        <a
          href="https://wa.me/"
          style={{
            display: 'inline-block',
            padding: '0.8rem 2rem',
            background: '#25D366',
            color: 'white',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: '1.1rem',
            fontWeight: 'bold',
          }}
        >
          התחל/י שיחה בוואטסאפ
        </a>
      </section>

      <footer style={{ textAlign: 'center', marginTop: '3rem', padding: '1rem', color: '#888', fontSize: '0.9rem' }}>
        <p>הפרויקט מתמקד בנגישות תעסוקתית לאנשים המתמודדים עם פוסט-טראומה בישראל</p>
      </footer>
    </main>
  );
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '1rem',
      padding: '1.5rem',
      background: '#f8f9fa',
      borderRadius: 8,
      border: '1px solid #e9ecef',
    }}>
      <div style={{
        minWidth: 40,
        height: 40,
        borderRadius: '50%',
        background: '#1a1a2e',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '1.1rem',
      }}>
        {number}
      </div>
      <div>
        <h3 style={{ margin: '0 0 0.3rem', color: '#1a1a2e' }}>{title}</h3>
        <p style={{ margin: 0, color: '#555' }}>{description}</p>
      </div>
    </div>
  );
}
