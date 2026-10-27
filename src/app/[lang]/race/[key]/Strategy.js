import { getRaceStrategy } from '@/lib/f1/race-extras';
import { getCompound, stintsByDriver } from '@/lib/f1/tyres';
import { formatNumber } from '@/lib/i18n/format';
import raceMessages from '@/lib/i18n/messages/race';
import { fill, pick } from '@/lib/i18n/messages';
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

function lapTicks(maxLap) {
    const ticks = Array.from({ length: Math.floor(maxLap / 10) + 1 }, (_, index) => index * 10);
    if (ticks.at(-1) !== maxLap) ticks.push(maxLap);
    return ticks;
}

function EmptyStrategy({ t, beforeRace = false }) {
    return (
        <section id="strategy" className={styles.block} aria-labelledby="strategy-heading">
            <h2 id="strategy-heading">{t.tyreStrategy}</h2>
            <p className={styles.notice}>{beforeRace ? t.strategyAfterRace : t.strategyUnavailable}</p>
        </section>
    );
}

/** Complete tyre stints and pit stops from OpenF1, ordered like the classification. */
export default async function Strategy({ meetingKey, raceStart, finishingOrder, lang, enabled = true }) {
    const t = pick(raceMessages, lang);
    if (!enabled || meetingKey == null) return <EmptyStrategy t={t} beforeRace />;

    let strategy;
    try {
        strategy = await getRaceStrategy(meetingKey, { raceStart, expectedNumbers: finishingOrder });
    } catch (error) {
        console.error('Race strategy failed', error);
        return <EmptyStrategy t={t} />;
    }
    if (!strategy?.stints?.length) return <EmptyStrategy t={t} />;

    const nameByNumber = new Map(strategy.drivers.map((driver) => [driver.number, driver.code || driver.lastName || `#${driver.number}`]));
    const grouped = stintsByDriver(strategy.stints);
    const maxLap = Math.max(1, ...strategy.stints.map((stint) => stint.lap_end));
    const ticks = lapTicks(maxLap);
    const order = new Map(finishingOrder.map((number, index) => [number, index]));
    const rows = [...grouped.entries()]
        .map(([driverNumber, stints]) => ({ driverNumber, stints, name: nameByNumber.get(driverNumber) || `#${driverNumber}` }))
        .sort((a, b) => (order.get(a.driverNumber) ?? Infinity) - (order.get(b.driverNumber) ?? Infinity));
    const stopsByDriver = new Map();
    for (const stop of strategy.pitStops) {
        if (stop.lap == null) continue;
        const stops = stopsByDriver.get(stop.driverNumber) || [];
        stops.push(stop);
        stopsByDriver.set(stop.driverNumber, stops);
    }
    const pitStops = [...strategy.pitStops].sort((a, b) => (a.lap ?? 0) - (b.lap ?? 0));

    return (
        <section id="strategy" className={styles.block} aria-labelledby="strategy-heading">
            <h2 id="strategy-heading">{t.tyreStrategy}</h2>
            <div className={styles.tyreAxisRow}>
                <span className={styles.tyreAxisLabel}>{t.lap}</span>
                <div className={styles.tyreAxisTrack} aria-hidden="true">
                    {ticks.map((lap) => <bdi key={lap} dir="ltr">{formatNumber(lang, lap)}</bdi>)}
                </div>
            </div>
            <ul className={styles.tyreGrid} aria-label={t.tyreStrategy}>
                {rows.map((row) => (
                    <li key={row.driverNumber} className={styles.tyreRow}>
                        <span className={styles.tyreDriver}><bdi dir="ltr">{row.name}</bdi></span>
                        <span className={styles.tyreBar}>
                            {row.stints.map((stint) => {
                                const compound = getCompound(stint.compound);
                                const start = Math.max(0, stint.lap_start - 1);
                                const width = Math.max(0, stint.lap_end - start);
                                const label = fill(t.stintDetail, {
                                    compound: compoundLabel(stint.compound, t),
                                    start: formatNumber(lang, stint.lap_start),
                                    end: formatNumber(lang, stint.lap_end),
                                });
                                return (
                                    <span
                                        key={stint.stint_number ?? stint.lap_start}
                                        className={styles.tyreStint}
                                        style={{
                                            '--stint-start': `${(start / maxLap) * 100}%`,
                                            '--stint-width': `${(width / maxLap) * 100}%`,
                                            background: compound.color,
                                        }}
                                        title={label}
                                        aria-label={label}
                                        tabIndex={0}
                                    >
                                        {compound.short}
                                    </span>
                                );
                            })}
                            {(stopsByDriver.get(row.driverNumber) || []).map((stop) => {
                                const label = fill(t.pitLap, { lap: formatNumber(lang, stop.lap) });
                                return (
                                    <span
                                        key={`pit-${stop.lap}`}
                                        className={styles.tyrePitMarker}
                                        style={{ '--pit-position': `${(stop.lap / maxLap) * 100}%` }}
                                        title={label}
                                        aria-label={label}
                                        tabIndex={0}
                                    />
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

            {pitStops.length > 0 && (
                <div className={styles.block} aria-labelledby="pits-heading">
                    <h3 id="pits-heading">{t.pitStops}</h3>
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
                </div>
            )}
        </section>
    );
}
