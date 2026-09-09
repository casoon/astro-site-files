import { describe, expect, it } from 'vitest'
import { renderSecurityTxt } from './security.js'
import { auditSecurity } from './audit.js'

describe('renderSecurityTxt', () => {
  it('renders single contact', () => {
    const result = renderSecurityTxt({ contact: 'mailto:security@example.com' })
    expect(result).toContain('Contact: mailto:security@example.com')
  })

  it('renders multiple contacts', () => {
    const result = renderSecurityTxt({
      contact: ['mailto:security@example.com', 'https://example.com/report']
    })
    expect(result).toContain('Contact: mailto:security@example.com')
    expect(result).toContain('Contact: https://example.com/report')
  })

  it('renders policy', () => {
    const result = renderSecurityTxt({
      contact: 'mailto:security@example.com',
      policy: 'https://example.com/security'
    })
    expect(result).toContain('Policy: https://example.com/security')
  })

  it('renders expires as ISO string', () => {
    const result = renderSecurityTxt({
      contact: 'mailto:security@example.com',
      expires: '2027-01-01T00:00:00.000Z'
    })
    expect(result).toContain('Expires: 2027-01-01T00:00:00.000Z')
  })

  it('renders expires as Date', () => {
    const date = new Date('2027-01-01T00:00:00.000Z')
    const result = renderSecurityTxt({
      contact: 'mailto:security@example.com',
      expires: date
    })
    expect(result).toContain('Expires: 2027-01-01T00:00:00.000Z')
  })

  it('renders acknowledgments', () => {
    const result = renderSecurityTxt({
      contact: 'mailto:security@example.com',
      acknowledgments: 'https://example.com/hall-of-fame'
    })
    expect(result).toContain('Acknowledgments: https://example.com/hall-of-fame')
  })

  it('renders preferred-languages', () => {
    const result = renderSecurityTxt({
      contact: 'mailto:security@example.com',
      preferredLanguages: ['en', 'de']
    })
    expect(result).toContain('Preferred-Languages: en, de')
  })

  it('renders canonical', () => {
    const result = renderSecurityTxt({
      contact: 'mailto:security@example.com',
      canonical: 'https://example.com/.well-known/security.txt'
    })
    expect(result).toContain('Canonical: https://example.com/.well-known/security.txt')
  })

  it('renders hiring', () => {
    const result = renderSecurityTxt({
      contact: 'mailto:security@example.com',
      hiring: 'https://example.com/jobs'
    })
    expect(result).toContain('Hiring: https://example.com/jobs')
  })

  it('renders encryption', () => {
    const result = renderSecurityTxt({
      contact: 'mailto:security@example.com',
      encryption: 'https://example.com/pgp-key.asc'
    })
    expect(result).toContain('Encryption: https://example.com/pgp-key.asc')
  })

  it('contact appears first', () => {
    const result = renderSecurityTxt({
      contact: 'mailto:security@example.com',
      policy: 'https://example.com/security'
    })
    expect(result.indexOf('Contact:')).toBeLessThan(result.indexOf('Policy:'))
  })

  it('output ends with a newline', () => {
    expect(renderSecurityTxt({ contact: 'mailto:security@example.com' }).endsWith('\n')).toBe(true)
  })
})

describe('auditSecurity', () => {
  const future = new Date(Date.now() + 86_400_000).toISOString()

  it('flags an expired Expires date', () => {
    const issues = auditSecurity({
      contact: 'mailto:security@example.com',
      expires: '2020-01-01T00:00:00.000Z',
    })
    expect(issues.map(i => i.rule)).toContain('security/expired')
  })

  it('flags an unparseable Expires date', () => {
    const issues = auditSecurity({ contact: 'mailto:security@example.com', expires: 'next year' })
    expect(issues.map(i => i.rule)).toContain('security/invalid-expires')
  })

  it('accepts an Expires date in the future', () => {
    const issues = auditSecurity({ contact: 'mailto:security@example.com', expires: future })
    expect(issues.map(i => i.rule)).not.toContain('security/expired')
    expect(issues.map(i => i.rule)).not.toContain('security/no-expires')
  })

  it('flags a bare e-mail address as Contact', () => {
    const issues = auditSecurity({ contact: 'security@example.com', expires: future })
    expect(issues.map(i => i.rule)).toContain('security/contact-not-a-uri')
  })

  it('accepts mailto:, https: and tel: contacts', () => {
    const issues = auditSecurity({
      contact: ['mailto:a@example.com', 'https://example.com/report', 'tel:+4900000'],
      expires: future,
    })
    expect(issues.map(i => i.rule)).not.toContain('security/contact-not-a-uri')
  })
})
