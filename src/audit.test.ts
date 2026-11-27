import { describe, expect, it } from 'vitest'
import { auditHumans, auditLlms, auditLlmsFull, auditRobots, auditSecurity } from './audit.js'

describe('auditRobots', () => {
  it('warns when legal pages are disallowed', () => {
    const issues = auditRobots({ disallow: ['/datenschutz/', '/admin'] })
    expect(issues.some(i => i.rule === 'robots/legal-pages-blocked')).toBe(true)
    expect(issues.find(i => i.rule === 'robots/legal-pages-blocked')?.level).toBe('warn')
  })

  it('warns for all legal path variants', () => {
    for (const path of ['/agb', '/impressum', '/privacy', '/terms', '/legal', '/imprint']) {
      const issues = auditRobots({ disallow: [path] })
      expect(issues.some(i => i.rule === 'robots/legal-pages-blocked'), path).toBe(true)
    }
  })

  it('does not warn for non-legal disallow paths', () => {
    const issues = auditRobots({ disallow: ['/admin', '/internal/'] })
    expect(issues.some(i => i.rule === 'robots/legal-pages-blocked')).toBe(false)
  })

  it('returns no issues for empty options', () => {
    expect(auditRobots({})).toHaveLength(0)
  })
})

describe('auditLlms', () => {
  it('reports info when description is missing', () => {
    const issues = auditLlms({ title: 'My Site' })
    expect(issues.some(i => i.rule === 'llms/no-description')).toBe(true)
  })

  it('reports info when sections are missing', () => {
    const issues = auditLlms({ title: 'My Site' })
    expect(issues.some(i => i.rule === 'llms/no-sections')).toBe(true)
  })

  it('reports info when sections have no links', () => {
    const issues = auditLlms({ title: 'T', sections: [{ title: 'Empty' }] })
    expect(issues.some(i => i.rule === 'llms/sections-without-links')).toBe(true)
  })

  it('returns no issues when fully configured', () => {
    const issues = auditLlms({
      title: 'T',
      description: 'A site.',
      sections: [{ title: 'S', links: [{ title: 'L', url: '/l' }] }],
    }, 'https://example.com')
    expect(issues).toHaveLength(0)
  })

  it('does not warn about missing sections when sources are configured', () => {
    const issues = auditLlms({ title: 'T', sources: [async () => ({ title: 'S' })] })
    expect(issues.every(i => i.rule !== 'llms/no-sections')).toBe(true)
  })

  it('warns about relative links when no site URL is known', () => {
    const issues = auditLlms({
      title: 'T',
      description: 'A site.',
      sections: [{ title: 'S', links: [{ title: 'L', url: '/lohnmosterei/' }] }],
    })
    const issue = issues.find(i => i.rule === 'llms/relative-links')
    expect(issue?.level).toBe('warn')
    expect(issue?.message).toContain('/lohnmosterei/')
  })

  it('does not warn about absolute links when no site URL is known', () => {
    const issues = auditLlms({
      title: 'T',
      description: 'A site.',
      sections: [{ title: 'S', links: [{ title: 'L', url: 'https://example.com/l' }] }],
    })
    expect(issues.every(i => i.rule !== 'llms/relative-links')).toBe(true)
  })
})

describe('auditSecurity', () => {
  it('warns when expires is missing', () => {
    const issues = auditSecurity({ contact: 'mailto:security@example.com' })
    expect(issues.some(i => i.rule === 'security/no-expires')).toBe(true)
    expect(issues.find(i => i.rule === 'security/no-expires')?.level).toBe('warn')
  })

  it('reports info when policy is missing', () => {
    const issues = auditSecurity({ contact: 'mailto:security@example.com' })
    expect(issues.some(i => i.rule === 'security/no-policy')).toBe(true)
    expect(issues.find(i => i.rule === 'security/no-policy')?.level).toBe('info')
  })

  it('returns no issues when fully configured', () => {
    const issues = auditSecurity({
      contact: 'mailto:security@example.com',
      expires: '2027-01-01T00:00:00.000Z',
      policy: 'https://example.com/security',
    })
    expect(issues).toHaveLength(0)
  })
})

describe('auditHumans', () => {
  it('reports info when team is missing', () => {
    const issues = auditHumans({})
    expect(issues.some(i => i.rule === 'humans/no-team')).toBe(true)
  })

  it('reports info when technology is missing', () => {
    const issues = auditHumans({})
    expect(issues.some(i => i.rule === 'humans/no-technology')).toBe(true)
  })

  it('returns no issues when team and technology are set', () => {
    const issues = auditHumans({
      team: [{ name: 'Alice' }],
      technology: ['Astro'],
    })
    expect(issues).toHaveLength(0)
  })
})

describe('auditLlmsFull', () => {
  const page = (url: string, markdown: string) => ({ title: url, url, markdown })
  const rules = (issues: { rule: string }[]) => issues.map(i => i.rule)

  it('is quiet for plain Markdown with absolute URLs resolvable', () => {
    expect(auditLlmsFull([page('/a/', '# A\n\nText with <b>html</b>.')], 'https://example.com')).toEqual([])
  })

  it('warns when there are no pages', () => {
    expect(rules(auditLlmsFull([], 'https://example.com'))).toEqual(['llms/full-no-pages'])
  })

  it('names the pages that still carry MDX imports, exports or component tags', () => {
    const issues = auditLlmsFull(
      [
        page('/imports/', "import Callout from '../Callout.astro'\n\nText"),
        page('/exports/', 'export const meta = {}\n\nText'),
        page('/component/', 'Text\n\n<Callout>Note</Callout>'),
        page('/plain/', 'Text about import and export.'),
      ],
      'https://example.com',
    )
    expect(rules(issues)).toEqual(['llms/full-mdx-syntax'])
    expect(issues[0]!.message).toContain('/imports/, /exports/, /component/')
    expect(issues[0]!.message).not.toContain('/plain/')
  })

  it('ignores imports and component tags inside fenced code blocks', () => {
    const markdown = [
      'Install it:',
      '',
      '```ts',
      "import siteFiles from '@casoon/astro-site-files'",
      '```',
      '',
      '~~~astro',
      '<Layout />',
      '~~~',
      '',
      '  ```js',
      '  export default {}',
      '  ```',
    ].join('\n')
    expect(auditLlmsFull([page('/docs/', markdown)], 'https://example.com')).toEqual([])
    expect(rules(auditLlmsFull([page('/mdx/', `${markdown}\n\nimport X from './x'`)], 'https://example.com'))).toEqual([
      'llms/full-mdx-syntax',
    ])
  })

  it('names pages that still start with a frontmatter block', () => {
    const issues = auditLlmsFull(
      [page('/raw/', '---\ntitle: Raw\n---\n\nText'), page('/rule/', 'Text\n\n---\n\nMore')],
      'https://example.com',
    )
    expect(rules(issues)).toEqual(['llms/full-frontmatter'])
    expect(issues[0]!.message).toContain('/raw/')
    expect(issues[0]!.message).not.toContain('/rule/')
  })

  it('warns about relative Source URLs only without a site URL', () => {
    expect(rules(auditLlmsFull([page('/a/', 'Text')]))).toEqual(['llms/full-relative-links'])
    expect(rules(auditLlmsFull([page('https://example.com/a/', 'Text')]))).toEqual([])
  })
})
