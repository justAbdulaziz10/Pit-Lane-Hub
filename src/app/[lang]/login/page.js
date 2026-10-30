import { localizedPageMetadata } from '@/lib/i18n/metadata';
import { pick } from '@/lib/i18n/messages';
import authMessages from '@/lib/i18n/messages/auth';
import LoginForm from './LoginForm';

export async function generateMetadata({ params }) {
    const { lang } = await params;
    const t = pick(authMessages, lang);
    return localizedPageMetadata(lang, '/login', {
        title: t.loginTitle,
        description: t.loginDescription,
    });
}

export default async function LoginPage({ params, searchParams }) {
    const [{ lang }, query] = await Promise.all([params, searchParams]);
    return <LoginForm searchParams={query || {}} />;
}
