import type { ShowcaseExample } from '@casoon/pages-theme/showcase';
import { generatedFile } from './inline-generated-files';
import source from './site-files.ts?raw';

// Each example shows one block of src/site-files.ts, the configuration this site passes to
// @casoon/astro-site-files, next to the file the integration wrote into this build's output.
// The output is a marker that inline-generated-files.ts replaces after the files exist.

/** The `export const <name>` block from site-files.ts, including the comment above it. */
function block(name: string): string {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`export const ${name}:`));
  if (start === -1) throw new Error(`site-files.ts: no export named ${name}`);
  let from = start;
  while (from > 0 && lines[from - 1].startsWith('//')) from--;
  let to = start;
  if (!lines[start].endsWith(';')) {
    while (to < lines.length && lines[to] !== '};') to++;
  }
  return lines.slice(from, to + 1).join('\n');
}

const astroConfig = [
  '// astro.config.mjs',
  `site: '${import.meta.env.SITE.replace(/\/$/, '')}',`,
  `base: '${import.meta.env.BASE_URL}',`,
  '',
].join('\n');

const config = (name: string, withUrls = false) =>
  `${withUrls ? `${astroConfig}\n` : ''}// site/src/site-files.ts\n${block(name)}`;

type Item = Omit<ShowcaseExample, 'file' | 'input' | 'output'> & {
  /** Export in site-files.ts. */
  option: string;
  /** File in the build output. */
  path: string;
  /** Prefix the site and base from astro.config.mjs; the file's URLs depend on them. */
  withUrls?: boolean;
};

const items: Item[] = [
  {
    slug: 'robots-txt',
    title: 'robots.txt',
    option: 'robots',
    path: 'robots.txt',
    withUrls: true,
    description:
      'The citationFriendly preset expanded into one group per known crawler. The Sitemap line is derived from site and base.',
    tags: ['robots', 'preset'],
  },
  {
    slug: 'llms-txt',
    title: 'llms.txt',
    option: 'llms',
    path: 'llms.txt',
    description: 'Title, summary, details and link sections in the llmstxt.org format.',
    tags: ['llms'],
  },
  {
    slug: 'sitemap-xml',
    title: 'sitemap.xml',
    option: 'sitemap',
    path: 'sitemap.xml',
    withUrls: true,
    description:
      'Every page of this site, discovered from the build output. The 404 page is left out by a built-in rule; priority follows the path depth below the base.',
    tags: ['sitemap'],
  },
  {
    slug: 'security-txt',
    title: 'security.txt',
    option: 'security',
    path: '.well-known/security.txt',
    description: 'Written to .well-known/ per RFC 9116, with an Expires date 180 days after this build.',
    tags: ['security', 'rfc 9116'],
  },
  {
    slug: 'humans-txt',
    title: 'humans.txt',
    option: 'humans',
    path: 'humans.txt',
    description: 'Team, colophon and note in the humanstxt.org layout; the date is the build date.',
    tags: ['humans'],
  },
];

export const examples: ShowcaseExample[] = items.map(({ option, path, withUrls, ...meta }) => ({
  ...meta,
  file: `dist/${path}`,
  input: { code: config(option, withUrls), lang: 'ts' },
  output: { html: generatedFile(path), kind: 'terminal' },
}));
