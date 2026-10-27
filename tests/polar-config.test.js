import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createPolar: vi.fn(() => ({})) }));
vi.mock('@polar-sh/sdk/2026-10', () => ({ createPolar: mocks.createPolar }));

async function loadPolar() {
    vi.resetModules();
    return import('@/lib/polar');
}

describe('Polar server selection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('POLAR_ACCESS_TOKEN', 'polar_oat_test');
        vi.stubEnv('POLAR_SERVER', '');
        vi.stubEnv('POLAR_ENV', '');
        vi.stubEnv('VERCEL_ENV', '');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it('accepts the legacy POLAR_ENV name', async () => {
        vi.stubEnv('POLAR_ENV', 'sandbox');
        const { getPolar } = await loadPolar();

        getPolar();

        expect(mocks.createPolar).toHaveBeenCalledWith({ accessToken: 'polar_oat_test', environment: 'sandbox' });
    });

    it('prefers POLAR_SERVER and defaults to production', async () => {
        vi.stubEnv('POLAR_SERVER', 'sandbox');
        expect((await loadPolar()).getPolarServer()).toBe('sandbox');

        vi.stubEnv('POLAR_SERVER', '');
        expect((await loadPolar()).getPolarServer()).toBe('production');
    });

    it('refuses to run when POLAR_SERVER and POLAR_ENV disagree', async () => {
        vi.stubEnv('POLAR_SERVER', 'production');
        vi.stubEnv('POLAR_ENV', 'sandbox');
        const { getPolar } = await loadPolar();

        expect(() => getPolar()).toThrow(/conflicts/);
        expect(mocks.createPolar).not.toHaveBeenCalled();
    });

    it('refuses an unknown server name instead of silently using production', async () => {
        vi.stubEnv('POLAR_SERVER', 'prod');
        const { getPolar } = await loadPolar();

        expect(() => getPolar()).toThrow(/production" or "sandbox/);
    });

    it('warns once when the production deployment points at the sandbox', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.stubEnv('POLAR_SERVER', 'sandbox');
        vi.stubEnv('VERCEL_ENV', 'production');
        const { getPolarServer } = await loadPolar();

        getPolarServer();
        getPolarServer();

        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0][0]).toMatch(/sandbox/);
    });
});
