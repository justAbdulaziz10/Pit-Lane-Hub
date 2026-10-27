import { getRaceStrategy } from '@/lib/f1/results';
import { getCompound, stintsByDriver } from '@/lib/f1/tyres';
import { formatNumber } from '@/lib/i18n/format';
import raceMessages from '@/lib/i18n/messages/race';
import { pick } from '@/lib/i18n/messages';
import styles from './page.module.css';

const COMPOUNDS = ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'];
const COMPOUND_KEYS = {
    SOFT: 'compoundSoft',
    MEDIUM: 'compoundMedium',
    HARD: 'compoundHard',
    INTERMEDIATE: 'compoundIntermediate',
    WET: 'compoundWet',
};

function compoundLabel(compound, t) {
    return t[COMPOUND_KEYS[String(compound).toUpperCase()] || 'compoundUnknown'];
}

/** Tyre stints and pit stops of a finished race, ordered like the classification. */
export default async function Strategy({ meetingKey, finishingOrder, lang }) {
    const t = pick(raceMessages, lang);
    let strategy;
    try {
        strategy = await getRaceStrategy(meetingKey);
    } catch (error) {
        console.error('Race strategy failed', error);
        return (
            <section className={styles.block} aria-labelledby="strategy-heading">
                <h2 id="strategy-heading">{t.tyreStrategy}</h2>
                <p className={styles.notice}>{t.strategyUnavailable}</p>
            </section>
        );
    }
    if (strategy.stints.length === 0) return null;

    const nameByNumber = new Map(strategy.drivers.map((driver) => [driver.number, driver.code || driver.lastName || `#${driver.number}`]));
    const grouped = stintsByDriver(strategy.stints);
    const maxLap = Math.max(1, ...strategy.stints.map((stint) => (Number.isFinite(stint.lap_end) ? stint.lap_end : 0)));
    const order = new Map(finishingOrder.map((number, index) => [number, index]));
    const rows = [...grouped.entries()]
        .map(([driverNumber, stints]) => ({ driverNumber, stints, name: nameByNumber.get(driverNumber) || `#${driverNumber}` }))
        .sort((a, b) => (order.get(a.driverNumber) ?? Infinity) - (order.get(b.driverNumber) ?? Infinity));
    const pitStops = [...strategy.pitStops].sort((a, b) => (a.lap ?? 0) - (b.lap ?? 0));

    return (
        <>
            <section className={styles.block} aria-labelledby="strategy-heading">
                <h2 id="strategy-heading">{t.tyreStrategy}</h2>
                <ul className={styles.tyreGrid}>
                    {rows.map((row) => (
                        <li key={row.driverNumber} className={styles.tyreRow}>
                            <span className={styles.tyreDriver}>{row.name}</span>
                            <span className={styles.tyreBar}>
                                {row.stints.map((stint) => {
                                    const compound = getCompound(stint.compound);
                                    return (
                                        <span
                                            key={stint.stint_number ?? stint.lap_start}
                                            className={styles.tyreStint}
                                            style={{ width: `${(stint.laps / maxLap) * 100}%`, background: compound.color }}
                                            title={`${compoundLabel(stint.compound, t)}: ${formatNumber(lang, stint.laps)} ${t.laps}`}
                                        >
                                            {compound.short}
                                            <span className={styles.srOnly}> {compoundLabel(stint.compound, t)}, <bdi dir="ltr">{formatNumber(lang, stint.laps)}</bdi> {t.laps}</span>
                                        </span>
                                    );
                                })}
                            </span>
                        </li>
                    ))}
                </ul>
                <ul className={styles.tyreLegend} aria-label={t.compounds}>
                    {COMPOUNDS.map((name) => {
                        const compound = getCompound(name);
                        return (
                            <li key={name} className={styles.legendItem}>
                                <span className={styles.legendDot} style={{ background: compound.color }} />
                                {compoundLabel(name, t)}
                            </li>
                        );
                    })}
                </ul>
            </section>

            {pitStops.length > 0 && (
                <section className={styles.block} aria-labelledby="pits-heading">
                    <h2 id="pits-heading">{t.pitStops}</h2>
                    <div className={styles.tableScroll}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th scope="col">{t.driver}</th>
                                    <th scope="col" className={styles.num}>{t.lap}</th>
                                    <th scope="col" className={styles.num}>{t.pitLaneTime}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pitStops.map((stop) => (
                                    <tr key={`${stop.driverNumber}-${stop.lap}`}>
                                        <th scope="row"><bdi dir="ltr">{nameByNumber.get(stop.driverNumber) || `#${stop.driverNumber}`}</bdi></th>
                                        <td className={styles.num}><bdi dir="ltr">{stop.lap == null ? '—' : formatNumber(lang, stop.lap)}</bdi></td>
                                        <td className={`${styles.num} ${styles.mono}`}><bdi dir="ltr">{Number.isFinite(stop.duration) ? `${stop.duration.toFixed(1)}s` : '—'}</bdi></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </>
    );
}
