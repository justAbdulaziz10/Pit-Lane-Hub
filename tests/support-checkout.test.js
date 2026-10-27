import { describe, expect, it } from 'vitest';
import { getCheckoutOutcome } from '@/lib/checkout-response';

describe('checkout response handling', () => {
    it('directs an existing Pro subscriber to their portal from a 409 response', () => {
        expect(getCheckoutOutcome(409, {
            error: 'You already have an active Pit Lane Pro subscription.',
            portalUrl: '/api/polar/portal',
        })).toEqual({ type: 'manage', url: '/api/polar/portal' });
    });

    it('accepts a checkout URL and ignores generic server error copy', () => {
        expect(getCheckoutOutcome(200, { url: 'https://checkout.polar.sh/session' })).toEqual({
            type: 'checkout',
            url: 'https://checkout.polar.sh/session',
        });
        expect(getCheckoutOutcome(503, { error: 'English server details' })).toEqual({ type: 'error' });
    });
});
