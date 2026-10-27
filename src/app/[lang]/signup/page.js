import { localizedPageMetadata } from '@/lib/i18n/metadata';
import { pick } from '@/lib/i18n/messages';
import authMessages from '@/lib/i18n/messages/auth';
import SignupForm from './SignupForm';

export async function generateMetadata({ params }) {
    const { lang } = await params;
    const t = pick(authMessages, lang);
    return localizedPageMetadata(lang, '/signup', {
        title: t.signupTitle,
        description: t.signupDescription,
    });
}

export default function SignupPage() {
    return <SignupForm />;
}
