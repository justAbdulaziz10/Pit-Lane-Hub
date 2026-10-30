'use client';

import { useMemo, useState } from 'react';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { fill, pick } from '@/lib/i18n/messages';
import driverMessages from '@/lib/i18n/messages/drivers';
import { formatNumber } from '@/lib/i18n/format';
import { favouritesFirst, filterDrivers, groupByTeam } from '@/app/[lang]/drivers/filter';
import DriverCard from '@/components/DriverCard';
import { useFavorites } from '@/lib/useFavorites';
import styles from './DriversGrid.module.css';

function noDriversMatch(query, t) {
    return fill(t.noDriversMatch, { query });
}

export default function DriversGrid({ drivers, initialQuery = '' }) {
    const locale = useLocale();
    const t = pick(driverMessages, locale);
    const { favorites } = useFavorites();
    const [query, setQuery] = useState(initialQuery);
    const [team, setTeam] = useState('');
    const [view, setView] = useState('championship');

    const teams = useMemo(() => [...new Set(drivers.map((driver) => driver.team).filter(Boolean))].sort(), [drivers]);
    const visible = useMemo(() => filterDrivers(drivers, { query, team }), [drivers, query, team]);
    const ordered = useMemo(() => {
        if (view !== 'number') return visible;
        return favouritesFirst([...visible].sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity)), favorites);
    }, [visible, favorites, view]);
    const groups = useMemo(() => (view === 'team' ? groupByTeam(visible) : []), [visible, view]);

    return (
        <div className={styles.gridShell}>
            <div className={`${styles.toolbar} rich-card`}>
                <label className={styles.field}>
                    <span className={styles.label}>{t.search}</span>
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t.searchPlaceholder}
                        aria-label={t.search}
                        className={styles.input}
                    />
                </label>
                <label className={styles.field}>
                    <span className={styles.label}>{t.team}</span>
                    <select aria-label={t.team} value={team} onChange={(event) => setTeam(event.target.value)} className={styles.input}>
                        <option value="">{t.allTeams}</option>
                        {teams.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                </label>
                <div className={styles.field} role="group" aria-label={t.arrangeDrivers}>
                    <span className={styles.label} aria-hidden="true">{t.arrange}</span>
                    <div className={styles.segmented}>
                        <button type="button" aria-pressed={view === 'number'} onClick={() => setView('number')}>{t.byNumber}</button>
                        <button type="button" aria-pressed={view === 'championship'} onClick={() => setView('championship')}>{t.byChampionship}</button>
                        <button type="button" aria-pressed={view === 'team'} onClick={() => setView('team')}>{t.byTeam}</button>
                    </div>
                </div>
            </div>

            <p className={styles.count} aria-live="polite">
                {visible.length === drivers.length
                    ? fill(t.driverCount, { count: formatNumber(locale, drivers.length) })
                    : fill(t.driverCountFiltered, { shown: formatNumber(locale, visible.length), total: formatNumber(locale, drivers.length) })}
            </p>

            {visible.length === 0 ? (
                <p className={styles.empty}>{noDriversMatch(query, t)}</p>
            ) : view === 'team' ? (
                groups.map((group) => (
                    <section key={group.team} className={styles.group} style={{ '--team-color': group.colour }}>
                        <h2 className={`team-accent ${styles.groupTitle}`}>{group.team === 'Unknown team' ? t.unknownTeam : group.team}</h2>
                        <div className={styles.grid}>
                            {group.drivers.map((driver) => <DriverCard key={driver.key} driver={driver} headingLevel={3} />)}
                        </div>
                    </section>
                ))
            ) : (
                <div className={styles.grid}>
                    {ordered.map((driver) => <DriverCard key={driver.key} driver={driver} />)}
                </div>
            )}
        </div>
    );
}
