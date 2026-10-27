import { notFound } from 'next/navigation';

// Unknown URLs render the localized not-found page inside the [lang] layout.
export default function Missing() {
    notFound();
}
