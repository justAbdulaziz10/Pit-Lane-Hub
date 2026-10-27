import { describe, expect, it } from 'vitest';
import { jsonLdScript } from '@/lib/jsonld';
import { resolveSiteUrl } from '@/lib/site';
import { metadata as driversMetadata, generateMetadata as driversGenerateMetadata } from '@/app/[lang]/drivers/layout';
import { metadata as teamsMetadata, generateMetadata as teamsGenerateMetadata } from '@/app/[lang]/teams/layout';
import { metadata as liveMetadata, generateMetadata as liveGenerateMetadata } from '@/app/[lang]/live/layout';
import { metadata as tracksMetadata, generateMetadata as tracksGenerateMetadata } from '@/app/[lang]/tracks/layout';
import { metadata as historyMetadata, generateMetadata as historyGenerateMetadata } from '@/app/[lang]/history/layout';
import { metadata as supportMetadata, generateMetadata as supportGenerateMetadata } from '@/app/[lang]/support/layout';

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
});
