// @ts-check
import siteFiles from '@casoon/astro-site-files';
import casoonPages from '@casoon/pages-theme';
import { defineConfig } from 'astro/config';
import inlineGeneratedFiles from './src/inline-generated-files.ts';
import { siteFilesOptions } from './src/site-files.ts';

// Project page: https://casoon.github.io/astro-site-files/. `site` is the host only: Astro and
// astro-site-files both append `base`, so repeating the path in `site` would double it.
export default defineConfig({
  site: 'https://casoon.github.io',
  base: '/astro-site-files/',
  integrations: [
    casoonPages({
      name: 'astro-site-files',
      description:
        'Astro integration that generates robots.txt, llms.txt, sitemap.xml, security.txt and humans.txt at build time from typed configuration.',
      repo: 'casoon/astro-site-files',
      version: '0.5.0',
      license: 'MIT',
      packages: [{ label: 'npm', href: 'https://www.npmjs.com/package/@casoon/astro-site-files' }],
      docsGroups: {
        'getting-started': 'Getting started',
        configuration: 'Configuration',
        guides: 'Guides',
        reference: 'Reference',
      },
    }),
    // Dogfooding: this site's own robots.txt, llms.txt, sitemap.xml, security.txt and humans.txt.
    siteFiles(siteFilesOptions),
    // Must follow siteFiles(): copies the files it wrote into the showcase pages.
    inlineGeneratedFiles(),
  ],
});
