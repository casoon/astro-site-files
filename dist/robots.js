export function renderRobotsTxt(options, siteUrl) {
    const lines = [];
    lines.push('User-agent: *');
    if (options.allow?.length) {
        for (const path of options.allow) {
            lines.push(`Allow: ${path}`);
        }
    }
    if (options.disallow?.length) {
        for (const path of options.disallow) {
            lines.push(`Disallow: ${path}`);
        }
    }
    else {
        lines.push('Disallow:');
    }
    if (options.crawlDelay !== undefined) {
        lines.push(`Crawl-delay: ${options.crawlDelay}`);
    }
    if (options.agents?.length) {
        for (const agent of options.agents) {
            lines.push('');
            const agents = Array.isArray(agent.userAgent) ? agent.userAgent : [agent.userAgent];
            for (const ua of agents) {
                lines.push(`User-agent: ${ua}`);
            }
            if (agent.allow?.length) {
                for (const path of agent.allow) {
                    lines.push(`Allow: ${path}`);
                }
            }
            if (agent.disallow?.length) {
                for (const path of agent.disallow) {
                    lines.push(`Disallow: ${path}`);
                }
            }
            if (agent.crawlDelay !== undefined) {
                lines.push(`Crawl-delay: ${agent.crawlDelay}`);
            }
        }
    }
    if (options.sitemap !== false) {
        const sitemapUrl = typeof options.sitemap === 'string'
            ? options.sitemap
            : siteUrl
                ? new URL('/sitemap.xml', siteUrl).href
                : undefined;
        if (sitemapUrl) {
            lines.push('');
            lines.push(`Sitemap: ${sitemapUrl}`);
        }
    }
    return lines.join('\n') + '\n';
}
