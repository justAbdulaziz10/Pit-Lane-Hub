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

    it('counts races after the standings round, including rounds without a session time', () => {
        const rounds = [
            {
                round: 17,
                raceStart: '2026-10-25T20:00:00Z',
                sessions: { race: '2026-10-25T20:00:00Z' },
            },
            {
                round: 16,
                raceStart: '2026-10-18T20:00:00Z',
                sessions: { race: '2026-10-18T20:00:00Z' },
            },
            {
                round: 18,
                raceStart: '2026-10-31T20:00:00Z',
                sessions: { race: '2026-10-31T20:00:00Z', sprint: '2026-10-31T18:00:00Z' },
            },
            { round: 19, raceDate: '2026-11-15', raceStart: null, sessions: { race: null } },
        ];
        const standingsRound = 17;

        expect(countRemainingRaces(rounds, standingsRound)).toBe(2);
        expect(countRemainingSprints(rounds, standingsRound)).toBe(1);
    });

    it('keeps a just-finished round in the points total while standings lag', () => {
        const rounds = [
            { round: 4, raceStart: '2026-10-18T20:00:00Z', sessions: { race: '2026-10-18T20:00:00Z' } },
            { round: 3, raceStart: '2026-10-11T20:00:00Z', sessions: { race: '2026-10-11T20:00:00Z' } },
            { round: 5, raceStart: '2026-10-25T20:00:00Z', sessions: { race: '2026-10-25T20:00:00Z', sprint: '2026-10-24T18:00:00Z' } },
            { round: 6, raceDate: '2026-11-01', raceStart: null, sessions: { race: null } },
        ];
        const standingsRound = 4;

        expect(countRemainingRaces(rounds, standingsRound)).toBe(2);
        expect(countRemainingSprints(rounds, standingsRound)).toBe(1);
    });
});
