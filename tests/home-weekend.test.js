import { describe, expect, it } from 'vitest';
import { countRemainingRaces, countRemainingSprints, getWeekendSessions, nextWeekendSession } from '@/app/[lang]/_home/weekend';

describe('weekend session helpers', () => {
    it('lists all available weekend sessions in time order and picks the next unstarted one', () => {
        const event = {
            raceStart: '2026-11-01T20:00:00Z',
            sessions: {
                firstPractice: '2026-10-30T18:30:00Z',
                sprintQualifying: '2026-10-30T22:30:00Z',
                sprint: '2026-10-31T18:00:00Z',
                qualifying: '2026-10-31T22:00:00Z',
                race: '2026-11-01T20:00:00Z',
            },
        };

        expect(getWeekendSessions(event).map(({ key }) => key)).toEqual([
            'firstPractice', 'sprintQualifying', 'sprint', 'qualifying', 'race',
        ]);
        expect(nextWeekendSession(event, Date.parse('2026-10-30T20:00:00Z'))).toMatchObject({
            key: 'sprintQualifying',
            start: '2026-10-30T22:30:00Z',
        });
    });

    it('counts future and in-progress races and sprints as remaining points', () => {
        const rounds = [
            {
                raceStart: '2026-11-01T20:00:00Z',
                sessions: { race: '2026-11-01T20:00:00Z', sprint: '2026-10-31T18:00:00Z' },
                sessionWindows: [
                    { start: '2026-11-01T20:00:00Z', end: '2026-11-01T22:00:00Z' },
                    { start: '2026-10-31T18:00:00Z', end: '2026-10-31T19:00:00Z' },
                ],
            },
            { raceStart: '2026-11-15T20:00:00Z', sessions: { race: '2026-11-15T20:00:00Z' } },
            { raceStart: '2026-10-25T20:00:00Z', sessions: { race: '2026-10-25T20:00:00Z' } },
        ];
        const now = Date.parse('2026-11-01T20:30:00Z');

        expect(countRemainingRaces(rounds, now)).toBe(2);
        expect(countRemainingSprints(rounds, now)).toBe(0);
    });
});
