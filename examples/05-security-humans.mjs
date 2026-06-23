/**
 * 05 — security.txt and humans.txt
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
        contact: 'mailto:info@casoon.de',
        expires: '2027-01-01T00:00:00.000Z',
        policy: 'https://www.casoon.de/security-policy/',
        acknowledgments: 'https://www.casoon.de/hall-of-fame/',
        preferredLanguages: ['en', 'de'],
        hiring: 'https://www.casoon.de/jobs/',
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
        thanks: [
          'Open Source Community',
          'Our clients for their trust',
        ],
        technology: ['Astro', 'Tailwind CSS', 'TypeScript', 'Cloudflare'],
        note: 'Built with care.',
      },
    }),
  ],
})
