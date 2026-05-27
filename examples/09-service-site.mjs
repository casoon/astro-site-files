/**
 * 08 — Full config for a service / agency site
 *
 * A realistic setup for a regional service business:
 *   - robots.txt uses seoOnly preset + blocks internal paths
 *   - llms.txt with full service and contact structure
 *   - sitemap excludes legal/internal pages, custom priority for key services
 *   - security.txt with contact, expiry and disclosure policy
 *   - humans.txt with team and technology stack
 *
 * astro.config.mjs
 */
import siteFiles from '@casoon/astro-site-files'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://example.com',
  trailingSlash: 'always',

  integrations: [
    siteFiles({
      robots: {
        preset: 'seoOnly',                              // blocks AI training + archives
        disallow: ['/admin/', '/preview/', '/demo/'],   // also hide internal paths
        agents: [
          { userAgent: ['AhrefsBot', 'SemrushBot'], crawlDelay: 10 },  // slow down, don't block
        ],
      },

      llms: {
        title: 'Acme Digital',
        description: 'Digital agency for small and medium businesses. Web development, SEO, e-commerce and cloud solutions.',
        details: 'Independent studio based in Hamburg. Direct client collaboration without agency overhead. Serving businesses across Germany.',

        sections: [
          {
            title: 'Services',
            links: [
              { title: 'Web Development', url: '/services/web-development/', description: 'Astro, Tailwind, headless CMS' },
              { title: 'E-Commerce', url: '/services/ecommerce/', description: 'Shopify, WooCommerce, custom headless shops' },
              { title: 'SEO & Marketing', url: '/services/seo/', description: 'Technical SEO, local search, AI visibility' },
              { title: 'Cloud & Hosting', url: '/services/cloud/', description: 'EU hosting, Cloudflare, migrations' },
              { title: 'All services', url: '/services/', description: 'Full catalogue with packages and pricing' },
            ],
          },
          {
            title: 'About',
            links: [
              { title: 'Working method', url: '/about/working-method/', description: 'From first contact to launch' },
              { title: 'Technologies', url: '/about/technologies/', description: 'Frameworks and platforms in use' },
            ],
          },
          {
            title: 'Contact',
            links: [
              { title: 'Get in touch', url: '/contact/', description: 'Direct contact — no forms, no sales team' },
            ],
          },
        ],
      },

      sitemap: {
        exclude: ['/404/', '/admin/', '/preview/', '/demo/'],

        priority: [
          { pattern: /^\/$/, priority: 1.0 },
          { pattern: '/services/', priority: 0.9 },
          { pattern: '/contact/', priority: 0.8 },
          { pattern: '/about/', priority: 0.6 },
          { pattern: /^\/(privacy|terms|imprint)\/?$/, priority: 0.2 },
        ],

        changefreq: [
          { pattern: /^\/$/, changefreq: 'weekly' },
          { pattern: /^\/contact\/?$/, changefreq: 'weekly' },
          { pattern: '/services/', changefreq: 'monthly' },
          { pattern: /^\/(privacy|terms|imprint)\/?$/, changefreq: 'yearly' },
        ],
      },

      security: {
        contact: 'mailto:info@casoon.de',
        expires: '2027-01-01T00:00:00.000Z',
        policy: 'https://www.casoon.de/security-policy/',
        preferredLanguages: ['en', 'de'],
      },

      humans: {
        team: [
          {
            name: 'Jörn Seidel',
            role: 'Development & Design',
            location: 'Germany',
            email: 'info@casoon.de',
          },
        ],
        technology: ['Astro', 'Tailwind CSS', 'TypeScript', 'Cloudflare'],
      },
    }),
  ],
})
