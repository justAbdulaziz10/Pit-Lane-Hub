import Link from 'next/link';
import CircuitPanel from '@/components/CircuitPanel';
import { getCircuitView } from '@/lib/f1/circuits';
import { localePath } from '@/lib/i18n/config';
import raceMessages from '@/lib/i18n/messages/race';
import { pick } from '@/lib/i18n/messages';
import styles from './RaceMap.module.css';

export default function RaceMap({ trackInfo, circuitId, lang }) {
    const t = pick(raceMessages, lang);
    const id = circuitId || trackInfo?.circuitId;
    const circuit = id ? getCircuitView(id) : null;
    if (!circuit) return null;

    return (
        <section className={styles.section} aria-labelledby="circuit-heading">
            <div className="container">
                <div className={styles.head}>
            <h2 id="circuit-heading">{t.circuit}</h2>
                    <p>
                        <Link href={localePath(lang, `/tracks/${circuit.circuitId}`)}><bdi dir="ltr">{circuit.name}</bdi></Link>
                        {circuit.length && <span> · {circuit.length}</span>}
                    </p>
                </div>
                <CircuitPanel circuit={circuit} />
            </div>
        </section>
    );
}
