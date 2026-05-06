import { describe, expect, it } from 'vitest'
import { renderHumansTxt } from './humans.js'

describe('renderHumansTxt', () => {
  it('renders team section', () => {
    const result = renderHumansTxt({ team: [{ name: 'Jörn' }] })
    expect(result).toContain('/* TEAM */')
    expect(result).toContain('Name: Jörn')
  })

  it('renders all team member fields', () => {
    const result = renderHumansTxt({
      team: [{
        name: 'Jörn',
        role: 'Development',
        twitter: '@joern',
        location: 'Germany',
        email: 'joern@example.com'
      }]
    })
    expect(result).toContain('Name: Jörn')
    expect(result).toContain('Role: Development')
    expect(result).toContain('Twitter: @joern')
    expect(result).toContain('Location: Germany')
    expect(result).toContain('Email: joern@example.com')
  })

  it('renders thanks section', () => {
    const result = renderHumansTxt({ thanks: ['Open Source Community'] })
    expect(result).toContain('/* THANKS */')
    expect(result).toContain('Open Source Community')
  })

  it('renders technology section', () => {
    const result = renderHumansTxt({ technology: ['Astro', 'TypeScript'] })
    expect(result).toContain('/* TECHNOLOGY COLOPHON */')
    expect(result).toContain('Astro, TypeScript')
  })

  it('renders note section', () => {
    const result = renderHumansTxt({ note: 'Built with ❤️' })
    expect(result).toContain('/* NOTE */')
    expect(result).toContain('Built with ❤️')
  })

  it('renders last update from string', () => {
    const result = renderHumansTxt({ lastUpdate: '2026-01-01' })
    expect(result).toContain('/* SITE LAST UPDATED */')
    expect(result).toContain('2026-01-01')
  })

  it('renders last update from Date', () => {
    const result = renderHumansTxt({ lastUpdate: new Date('2026-01-01T00:00:00.000Z') })
    expect(result).toContain('2026-01-01')
  })

  it('defaults last update to today', () => {
    const today = new Date().toISOString().split('T')[0]
    const result = renderHumansTxt({})
    expect(result).toContain(today)
  })

  it('renders multiple team members', () => {
    const result = renderHumansTxt({
      team: [{ name: 'Alice', role: 'Design' }, { name: 'Bob', role: 'Dev' }]
    })
    expect(result).toContain('Name: Alice')
    expect(result).toContain('Name: Bob')
  })

  it('team section appears before thanks', () => {
    const result = renderHumansTxt({
      team: [{ name: 'Alice' }],
      thanks: ['Community']
    })
    expect(result.indexOf('/* TEAM */')).toBeLessThan(result.indexOf('/* THANKS */'))
  })

  it('output ends with a newline', () => {
    expect(renderHumansTxt({}).endsWith('\n')).toBe(true)
  })
})
