import { describe, expect, it } from 'vitest'
import { renderSecurityTxt } from './security.js'

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
