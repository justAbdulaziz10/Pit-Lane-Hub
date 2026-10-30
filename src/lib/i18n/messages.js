import { DEFAULT_LOCALE } from './config';

/** Pick a namespace's English strings; extra locale arguments remain harmless. */
export function pick(namespace) {
    return namespace[DEFAULT_LOCALE];
}

/** Fill `{name}` placeholders: fill('Round {round}', { round: 3 }) → 'Round 3'. */
export function fill(template, values = {}) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}
