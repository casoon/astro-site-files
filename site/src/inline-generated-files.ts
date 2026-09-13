import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

// Pages are rendered before @casoon/astro-site-files writes its files in `astro:build:done`.
// Pages therefore contain a marker per file; this integration, listed after siteFiles(),
// replaces each marker with the file exactly as it was written to the build output.

const MARKER = /%%generated-file:([^%]+)%%/g;

/** Marker for a file in the build output, e.g. `generatedFile('robots.txt')`. */
export const generatedFile = (path: string) => `%%generated-file:${path}%%`;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function htmlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => join(entry.parentPath, entry.name));
}

export default function inlineGeneratedFiles(): AstroIntegration {
  return {
    name: 'inline-generated-files',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const cache = new Map<string, string>();
        const load = async (path: string) => {
          if (!cache.has(path)) cache.set(path, escapeHtml(await readFile(join(outDir, path), 'utf8')));
          return cache.get(path) as string;
        };

        for (const file of await htmlFiles(outDir)) {
          const html = await readFile(file, 'utf8');
          const paths = [...new Set([...html.matchAll(MARKER)].map((match) => match[1]))];
          if (paths.length === 0) continue;
          const contents = new Map(await Promise.all(paths.map(async (p) => [p, await load(p)] as const)));
          await writeFile(file, html.replace(MARKER, (_, path: string) => contents.get(path) as string));
        }
        logger.info(`inlined ${[...cache.keys()].join(', ')}`);
      },
    },
  };
}
