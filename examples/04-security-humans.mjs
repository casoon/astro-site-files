/**
 * 04 — security.txt and humans.txt
 *
 * security.txt is written to /.well-known/security.txt per RFC 9116.
 * `contact` and `expires` are required by the specification.
 *
 * humans.txt follows humanstxt.org.
 * `lastUpdate` defaults to the build date if omitted.
 *
 * astro.config.mjs
 */
import siteFiles from '@casoon/astro-site-files'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles({
      security: {
        contact: 'mailto:security@example.com',
        expires: '2027-01-01T00:00:00.000Z',
        policy: 'https://example.com/security-policy/',
        acknowledgments: 'https://example.com/hall-of-fame/',
        preferredLanguages: ['en', 'de'],
        hiring: 'https://example.com/jobs/',
      },

      humans: {
        team: [
          {
            name: 'Alice Müller',
            role: 'Development & Design',
            location: 'Hamburg, Germany',
          },
          {
            name: 'Bob Schmidt',
            role: 'Project Management',
            twitter: '@bobschmidt',
          },
        ],
        thanks: [
          'Open Source Community',
          'Our clients for their trust',
        ],
        technology: ['Astro', 'Tailwind CSS', 'TypeScript', 'Cloudflare'],
        note: 'Built with care in Hamburg.',
      },
    }),
  ],
})
