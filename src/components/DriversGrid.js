'use client';

import { useMemo, useState } from 'react';
import { favouritesFirst, filterDrivers, groupByTeam } from '@/app/[lang]/drivers/filter';
import DriverCard from '@/components/DriverCard';
import { useFavorites } from '@/lib/useFavorites';
import styles from './DriversGrid.module.css';

export default function DriversGrid({ drivers, initialQuery = '' }) {
    const { favorites } = useFavorites();
    const [query, setQuery] = useState(initialQuery);
    const [team, setTeam] = useState('');
    const [view, setView] = useState('number');

    const teams = useMemo(() => [...new Set(drivers.map((driver) => driver.team))].sort(), [drivers]);
    const visible = useMemo(() => filterDrivers(drivers, { query, team }), [drivers, query, team]);
    const ordered = useMemo(() => favouritesFirst(visible, favorites), [visible, favorites]);
    const groups = useMemo(() => (view === 'team' ? groupByTeam(visible) : []), [visible, view]);

    return (
        <div>
            <div className={styles.toolbar}>
                <label className={styles.field}>
                    <span className={styles.label}>Search</span>
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Name, code, number or team"
                        className={styles.input}
                    />
                </label>
                <label className={styles.field}>
                    <span className={styles.label}>Team</span>
                    <select value={team} onChange={(event) => setTeam(event.target.value)} className={styles.input}>
                        <option value="">All teams</option>
                        {teams.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                </label>
                <div className={styles.field} role="group" aria-label="Arrange drivers">
                    <span className={styles.label} aria-hidden="true">Arrange</span>
                    <div className={styles.segmented}>
                        <button type="button" aria-pressed={view === 'number'} onClick={() => setView('number')}>By number</button>
                        <button type="button" aria-pressed={view === 'team'} onClick={() => setView('team')}>By team</button>
                    </div>
                </div>
            </div>

            <p className={styles.count} aria-live="polite">
                {visible.length === drivers.length ? `${drivers.length} drivers` : `${visible.length} of ${drivers.length} drivers`}
            </p>

            {visible.length === 0 ? (
                <p className={styles.empty}>No drivers match “{query}”.</p>
            ) : view === 'team' ? (
                groups.map((group) => (
                    <section key={group.team} className={styles.group} style={{ '--team-color': group.colour }}>
                        <h2 className={styles.groupTitle}>{group.team}</h2>
                        <div className={styles.grid}>
                            {group.drivers.map((driver) => <DriverCard key={driver.key} driver={driver} />)}
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
