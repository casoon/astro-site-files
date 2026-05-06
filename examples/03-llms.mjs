/**
 * 03 — llms.txt with structured sections
 *
 * llms.txt follows the llmstxt.org specification.
 * It gives AI models a structured overview of your site:
 * what you do, who you are, and where to find key content.
 *
 * Good sections to include:
 *   - Services / Products
 *   - About / Team / Working method
 *   - Regional focus (for local businesses)
 *   - Contact
 *   - Blog / Resources
 *
 * astro.config.mjs
 */
import siteFiles from '@casoon/astro-site-files'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles({
      llms: {
        title: 'Acme Web Agency',
        description: 'Full-service web agency specialising in Astro, headless CMS, and e-commerce.',
        details: 'Independent consultancy based in Hamburg. Works directly with clients — no account managers or agency overhead. Target audience: small and medium businesses, retail, professional services, healthcare.',

        sections: [
          {
            title: 'Services',
            links: [
              { title: 'Web Development', url: '/services/web-development/', description: 'Astro, Tailwind, headless CMS — fast, maintainable websites' },
              { title: 'E-Commerce', url: '/services/ecommerce/', description: 'Shopify, WooCommerce, custom headless shops' },
              { title: 'SEO & Marketing', url: '/services/seo/', description: 'Technical SEO, local search, AI visibility' },
              { title: 'Cloud & Hosting', url: '/services/cloud/', description: 'EU hosting, Cloudflare, migrations, APIs' },
              { title: 'Service catalogue', url: '/services/', description: 'All services with packages and pricing' },
            ],
          },
          {
            title: 'About',
            links: [
              { title: 'Working method', url: '/about/working-method/', description: 'How projects run from first contact to launch' },
              { title: 'Technologies', url: '/about/technologies/', description: 'Frameworks, tools and platforms we use' },
              { title: 'Team', url: '/about/team/', description: 'The people behind Acme' },
            ],
          },
          {
            title: 'Contact',
            links: [
              { title: 'Get in touch', url: '/contact/', description: 'Direct contact — no sales funnel, no delays' },
            ],
          },
          {
            title: 'Resources',
            links: [
              { title: 'Blog', url: '/blog/', description: 'Technical articles on web development, AI, cloud and marketing' },
            ],
          },
        ],
      },
    }),
  ],
})
