import Link from 'next/link';
import CircuitPanel from '@/components/CircuitPanel';
import { getCircuitView } from '@/lib/f1/circuits';
import styles from './RaceMap.module.css';

export default function RaceMap({ trackInfo, circuitId }) {
    const id = circuitId || trackInfo?.circuitId;
    const circuit = id ? getCircuitView(id) : null;
    if (!circuit) return null;

    return (
        <section className={styles.section} aria-labelledby="circuit-heading">
            <div className="container">
                <div className={styles.head}>
                    <h2 id="circuit-heading">Circuit</h2>
                    <p>
                        <Link href={`/tracks/${circuit.circuitId}`}>{circuit.name}</Link>
                        {circuit.length && <span> · {circuit.length}</span>}
                    </p>
                </div>
                <CircuitPanel circuit={circuit} />
            </div>
        </section>
    );
}
