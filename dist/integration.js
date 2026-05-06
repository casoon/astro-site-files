import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import astroSitemap from '@casoon/astro-sitemap';
import { renderRobotsTxt } from './robots.js';
import { renderLlmsTxt } from './llms.js';
import { renderSecurityTxt } from './security.js';
import { renderHumansTxt } from './humans.js';
export default function siteFiles(options = {}) {
    let siteUrl;
    return {
        name: '@casoon/astro-site-files',
        hooks: {
            'astro:config:setup'({ config, addIntegration }) {
                siteUrl = config.site;
                if (options.sitemap !== false) {
                    const sitemapOpts = typeof options.sitemap === 'object' ? options.sitemap : {};
                    addIntegration(astroSitemap(sitemapOpts));
                }
            },
            async 'astro:build:done'({ dir, logger }) {
                const outDir = fileURLToPath(dir);
                await writeRobots(outDir, options, siteUrl, logger);
                await writeLlms(outDir, options, siteUrl, logger);
                await writeSecurity(outDir, options, logger);
                await writeHumans(outDir, options, logger);
            },
        },
    };
}
async function writeRobots(outDir, options, siteUrl, logger) {
    if (options.robots === false)
        return;
    const robotsOpts = typeof options.robots === 'object' ? options.robots : {};
    await writeFile(join(outDir, 'robots.txt'), renderRobotsTxt(robotsOpts, siteUrl), 'utf-8');
    logger.info('robots.txt generated');
}
async function writeLlms(outDir, options, _siteUrl, logger) {
    if (!options.llms)
        return;
    if (options.llms === true) {
        logger.warn('llms: requires a title — provide an object with { title } to generate llms.txt');
        return;
    }
    await writeFile(join(outDir, 'llms.txt'), renderLlmsTxt(options.llms), 'utf-8');
    logger.info('llms.txt generated');
}
async function writeSecurity(outDir, options, logger) {
    if (!options.security)
        return;
    if (options.security === true || !options.security.contact) {
        logger.warn('security: requires a contact field (RFC 9116) — skipping security.txt');
        return;
    }
    const wellKnownDir = join(outDir, '.well-known');
    await mkdir(wellKnownDir, { recursive: true });
    await writeFile(join(wellKnownDir, 'security.txt'), renderSecurityTxt(options.security), 'utf-8');
    logger.info('.well-known/security.txt generated');
}
async function writeHumans(outDir, options, logger) {
    if (!options.humans)
        return;
    const humansOpts = typeof options.humans === 'object' ? options.humans : {};
    await writeFile(join(outDir, 'humans.txt'), renderHumansTxt(humansOpts), 'utf-8');
    logger.info('humans.txt generated');
}
