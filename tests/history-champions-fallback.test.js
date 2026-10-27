import { afterEach, describe, expect, it, vi } from 'vitest';

const getCalendarMock = vi.hoisted(() => vi.fn());

vi.mock('next/cache', () => ({ unstable_cache: (callback) => callback }));
vi.mock('@/lib/f1/season', () => ({ getCalendar: (...args) => getCalendarMock(...args) }));

import CHAMPIONS_HISTORY from '@/lib/f1/data/champions-history.json';
import { getChampions } from '@/lib/f1/history';

afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
});

describe('history snapshot', () => {
    it('returns snapshot champions when a post-snapshot calendar lookup is throttled', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
        getCalendarMock.mockRejectedValue(new Error('Jolpica HTTP 429'));

        await expect(getChampions()).resolves.toEqual(CHAMPIONS_HISTORY);
    });
});
