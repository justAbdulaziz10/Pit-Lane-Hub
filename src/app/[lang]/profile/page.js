import { localizedPageMetadata } from '@/lib/i18n/metadata';
import { pick } from '@/lib/i18n/messages';
import accountMessages from '@/lib/i18n/messages/account';
import ProfileClient from './ProfileClient';

export async function generateMetadata({ params }) {
    const { lang } = await params;
    const t = pick(accountMessages, lang);
    return localizedPageMetadata(lang, '/profile', {
        title: t.metadataTitle,
        description: t.metadataDescription,
    });
}

export default function ProfilePage() {
    return <ProfileClient />;
}
