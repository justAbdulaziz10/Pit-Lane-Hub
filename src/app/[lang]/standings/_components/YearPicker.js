'use client';

import { useId } from 'react';
import Link from 'next/link';
import { fill, pick } from '@/lib/i18n/messages';
import standingsMessages from '@/lib/i18n/messages/standings';
import { formatNumber } from '@/lib/i18n/format';
import { localePath } from '@/lib/i18n/config';
import { viewHref } from '@/app/[lang]/history/history-utils';
import styles from './standings.module.css';

function hrefFor(action, year, extraParams, lang) {
    if (action === '/history') return viewHref(year, extraParams.view || 'races', lang);
    const params = new URLSearchParams({ ...extraParams, year: String(year) });
    return localePath(lang, `${action}?${params.toString()}`);
}

export default function YearPicker({ action, year, min, max, extraParams = {}, label, lang = 'en' }) {
    const t = pick(standingsMessages, lang);
    const labelId = useId();
    const years = [];
    for (let value = max; value >= min; value -= 1) years.push(value);
    const previousArrow = '←';
    const nextArrow = '→';

    return (
        <form className={styles.picker} action={localePath(lang, action)} method="get">
            {year > min ? (
                <Link
                    className={styles.stepLink}
                    href={hrefFor(action, year - 1, extraParams, lang)}
                    aria-label={fill(t.previousSeason, { year: formatNumber(lang, year - 1, { useGrouping: false }) })}
                >
                    <span aria-hidden="true">{previousArrow}</span>
                </Link>
            ) : null}
            <label htmlFor={labelId}>{label || t.season}</label>
            <select
                id={labelId}
                name="year"
                dir="ltr"
                defaultValue={String(year)}
                onChange={(event) => window.location.assign(hrefFor(action, event.target.value, extraParams, lang))}
            >
                {years.map((value) => <option key={value} value={value}>{formatNumber(lang, value, { useGrouping: false })}</option>)}
            </select>
            {Object.entries(extraParams).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
            ))}
            {year < max ? (
                <Link
                    className={styles.stepLink}
                    href={hrefFor(action, year + 1, extraParams, lang)}
                    aria-label={fill(t.nextSeason, { year: formatNumber(lang, year + 1, { useGrouping: false }) })}
                >
                    <span aria-hidden="true">{nextArrow}</span>
                </Link>
            ) : null}
        </form>
    );
}
