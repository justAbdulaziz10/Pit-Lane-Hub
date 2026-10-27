export const SITE_NAME = 'Pit Lane Hub';
export const SITE_DESCRIPTION =
  'Follow every Formula 1 race with the season calendar, driver and team standings, live timing, circuit details, and championship history.';
export const FALLBACK_SITE_URL = 'https://f1-xi-weld.vercel.app';

export function resolveSiteUrl(env = process.env) {
  const configuredUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelHost = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const baseUrl = configuredUrl || (vercelHost ? `https://${vercelHost}` : FALLBACK_SITE_URL);

  return baseUrl.replace(/\/+$/, '');
}

export const SITE_URL = resolveSiteUrl();
