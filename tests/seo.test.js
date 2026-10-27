import { describe, expect, it } from 'vitest';
import { jsonLdScript } from '@/lib/jsonld';
import { resolveSiteUrl } from '@/lib/site';
import { metadata as driversMetadata, generateMetadata as driversGenerateMetadata } from '@/app/[lang]/drivers/layout';
import { metadata as teamsMetadata, generateMetadata as teamsGenerateMetadata } from '@/app/[lang]/teams/layout';
import { metadata as liveMetadata, generateMetadata as liveGenerateMetadata } from '@/app/[lang]/live/layout';
import { metadata as tracksMetadata, generateMetadata as tracksGenerateMetadata } from '@/app/[lang]/tracks/layout';
import { metadata as historyMetadata, generateMetadata as historyGenerateMetadata } from '@/app/[lang]/history/layout';
import { metadata as supportMetadata, generateMetadata as supportGenerateMetadata } from '@/app/[lang]/support/layout';
import { localizedPageMetadata } from '@/lib/i18n/metadata';
import authMessages from '@/lib/i18n/messages/auth';
import accountMessages from '@/lib/i18n/messages/account';
import supportMessages from '@/lib/i18n/messages/support';
import errorMessages from '@/lib/i18n/messages/errors';

async function readMetadata(metadata, generateMetadata) {
  if (metadata) return metadata;
  return generateMetadata?.({ params: Promise.resolve({ lang: 'en' }) });
}

describe('jsonLdScript', () => {
  it('escapes script-sensitive characters and round-trips through JSON.parse', () => {
    const value = {
      text: '<script>alert("&")</script>',
      separators: 'before\u2028middle\u2029after',
    };

    const serialized = jsonLdScript(value);

    expect(serialized).toContain('\\u003c');
    expect(serialized).toContain('\\u003e');
    expect(serialized).toContain('\\u0026');
    expect(serialized).toContain('\\u2028');
    expect(serialized).toContain('\\u2029');
    expect(JSON.parse(serialized)).toEqual(value);
  });
});

describe('resolveSiteUrl', () => {
  it('prefers NEXT_PUBLIC_SITE_URL and removes trailing slashes', () => {
    expect(resolveSiteUrl({
      NEXT_PUBLIC_SITE_URL: 'https://fans.example.test///',
      VERCEL_PROJECT_PRODUCTION_URL: 'plh.vercel.app',
    })).toBe('https://fans.example.test');
  });

  it('uses the Vercel production host when no public URL is configured', () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'plh.vercel.app/' })).toBe('https://plh.vercel.app');
  });

  it('falls back to the production site URL', () => {
    expect(resolveSiteUrl({})).toBe('https://f1-xi-weld.vercel.app');
  });
});

describe('segment metadata', () => {
  it('uses distinct plain titles and unique descriptions for each new layout', () => {
    const metadata = Promise.all([
      readMetadata(driversMetadata, driversGenerateMetadata),
      readMetadata(teamsMetadata, teamsGenerateMetadata),
      readMetadata(liveMetadata, liveGenerateMetadata),
      readMetadata(tracksMetadata, tracksGenerateMetadata),
      readMetadata(historyMetadata, historyGenerateMetadata),
      readMetadata(supportMetadata, supportGenerateMetadata),
    ]);
    return metadata.then((segments) => {
    const titles = segments.map((segment) => segment.title);
    const descriptions = segments.map((segment) => segment.description);

    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect(titles.every((title) => !title.includes('| Pit Lane Hub'))).toBe(true);
    });
  });

  it('localizes owned route metadata and emits matching canonical and language alternates', async () => {
    const paths = ['/login', '/signup', '/profile', '/support', '/verify-email', '/nope'];

    for (const path of paths) {
      const segment = path === '/profile' ? accountMessages : path === '/support' ? supportMessages
        : path === '/nope' ? errorMessages : authMessages;
      const titleKey = path === '/login' ? 'loginTitle' : path === '/signup' ? 'signupTitle'
        : path === '/profile' ? 'metadataTitle' : path === '/support' ? 'metadataTitle'
            : path === '/verify-email' ? 'verifyMetadataTitle' : 'notFoundMetadataTitle';
      const descriptionKey = path === '/login' ? 'loginDescription' : path === '/signup' ? 'signupDescription'
        : path === '/profile' ? 'metadataDescription' : path === '/support' ? 'metadataDescription'
            : path === '/verify-email' ? 'verifyDescription' : 'notFoundDescription';
      const metadata = localizedPageMetadata('ar', path, {
        title: segment.ar[titleKey],
        description: segment.ar[descriptionKey],
      });
      expect(metadata.title).toMatch(/[\u0600-\u06ff]/);
      expect(metadata.description).toMatch(/[\u0600-\u06ff]/);
      expect(metadata.alternates.canonical).toBe(`/ar${path}`);
      expect(metadata.alternates.languages.en).toBe(path);
      expect(metadata.alternates.languages.ar).toBe(`/ar${path}`);
      expect(metadata.openGraph.url).toBe(`/ar${path}`);
      expect(metadata.openGraph.locale).toBe('ar_SA');
    }
  });
});
