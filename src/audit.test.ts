import { describe, expect, it } from 'vitest'
import { auditHumans, auditLlms, auditRobots, auditSecurity } from './audit.js'

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
    })
    expect(issues).toHaveLength(0)
  })

  it('does not warn about missing sections when sources are configured', () => {
    const issues = auditLlms({ title: 'T', sources: [async () => ({ title: 'S' })] })
    expect(issues.every(i => i.rule !== 'llms/no-sections')).toBe(true)
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
