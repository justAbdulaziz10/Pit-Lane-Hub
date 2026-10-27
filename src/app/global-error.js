'use client';

import { useEffect } from 'react';

// Replaces the root layout when it fails, so it carries its own document and minimal styles.
// The locale comes from the URL because no provider is mounted here.
const COPY = {
    en: { title: 'Something went wrong', retry: 'Try again', home: 'Home' },
    ar: { title: 'حدث خطأ ما', retry: 'إعادة المحاولة', home: 'الرئيسية' },
};

export default function GlobalError({ error, reset }) {
    const isArabic = typeof window !== 'undefined' && /^\/ar(\/|$)/.test(window.location.pathname);
    const lang = isArabic ? 'ar' : 'en';
    const t = COPY[lang];

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html lang={lang} dir={isArabic ? 'rtl' : 'ltr'}>
            <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0f1115', color: '#f2f3f5', fontFamily: 'system-ui, sans-serif' }}>
                <main style={{ textAlign: 'center', padding: '2rem' }}>
                    <h1 style={{ fontSize: '1.5rem', marginBlockEnd: '1.5rem' }}>{t.title}</h1>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                        <button type="button" onClick={() => reset()} style={{ padding: '0.6rem 1.1rem', border: 0, borderRadius: 8, background: '#e10600', color: '#fff', font: 'inherit', cursor: 'pointer' }}>
                            {t.retry}
                        </button>
                        <a href={isArabic ? '/ar' : '/'} style={{ padding: '0.6rem 1.1rem', borderRadius: 8, border: '1px solid #3a3f4b', color: '#f2f3f5', textDecoration: 'none' }}>
                            {t.home}
                        </a>
                    </div>
                </main>
            </body>
        </html>
    );
}
