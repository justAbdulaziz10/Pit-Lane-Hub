/** Classifies Polar checkout API responses without exposing server error text to the UI. */
export function getCheckoutOutcome(status, data) {
    if (status === 409 && typeof data?.portalUrl === 'string' && data.portalUrl) {
        return { type: 'manage', url: data.portalUrl };
    }
    if (typeof data?.url === 'string' && data.url) {
        return { type: 'checkout', url: data.url };
    }
    return { type: 'error' };
}
