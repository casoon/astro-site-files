import { describe, expect, it } from 'vitest'
import { renderLlmsTxt } from './llms.js'

describe('renderLlmsTxt', () => {
  it('renders title as h1', () => {
    const result = renderLlmsTxt({ title: 'My Site' })
    expect(result).toContain('# My Site')
  })

  it('renders description as blockquote', () => {
    const result = renderLlmsTxt({ title: 'T', description: 'A great site.' })
    expect(result).toContain('> A great site.')
  })

  it('renders details paragraph', () => {
    const result = renderLlmsTxt({ title: 'T', details: 'More context here.' })
    expect(result).toContain('More context here.')
  })

  it('renders section heading', () => {
    const result = renderLlmsTxt({ title: 'T', sections: [{ title: 'Docs' }] })
    expect(result).toContain('## Docs')
  })

  it('renders section links', () => {
    const result = renderLlmsTxt({
      title: 'T',
      sections: [
        {
          title: 'Docs',
          links: [{ title: 'Getting started', url: 'https://example.com/docs' }]
        }
      ]
    })
    expect(result).toContain('- [Getting started](https://example.com/docs)')
  })

  it('renders link description when provided', () => {
    const result = renderLlmsTxt({
      title: 'T',
      sections: [
        {
          title: 'Docs',
          links: [{ title: 'API', url: '/api', description: 'REST API reference' }]
        }
      ]
    })
    expect(result).toContain('- [API](/api): REST API reference')
  })

  it('renders multiple sections', () => {
    const result = renderLlmsTxt({
      title: 'T',
      sections: [{ title: 'A' }, { title: 'B' }]
    })
    expect(result).toContain('## A')
    expect(result).toContain('## B')
  })

  it('output ends with a newline', () => {
    expect(renderLlmsTxt({ title: 'T' }).endsWith('\n')).toBe(true)
  })

  it('resolves a root-relative link against the site URL', () => {
    const result = renderLlmsTxt({
      title: 'T',
      sections: [{ title: 'S', links: [{ title: 'Lohnmosterei', url: '/lohnmosterei/' }] }],
    }, 'https://example.com')
    expect(result).toContain('- [Lohnmosterei](https://example.com/lohnmosterei/)')
  })

  it('keeps the base path of the site URL', () => {
    const result = renderLlmsTxt({
      title: 'T',
      sections: [{ title: 'S', links: [{ title: 'Docs', url: '/docs/' }] }],
    }, 'https://example.com/app')
    expect(result).toContain('(https://example.com/app/docs/)')
  })

  it('adds the missing slash for a link without a leading slash', () => {
    const result = renderLlmsTxt({
      title: 'T',
      sections: [{ title: 'S', links: [{ title: 'Docs', url: 'docs/' }] }],
    }, 'https://example.com/')
    expect(result).toContain('(https://example.com/docs/)')
  })

  it('leaves links that already carry a scheme untouched', () => {
    const result = renderLlmsTxt({
      title: 'T',
      sections: [{
        title: 'S',
        links: [
          { title: 'Docs', url: 'https://other.example/docs/' },
          { title: 'Mail', url: 'mailto:info@example.com' },
          { title: 'CDN', url: '//cdn.example.com/x' },
        ],
      }],
    }, 'https://example.com')
    expect(result).toContain('(https://other.example/docs/)')
    expect(result).toContain('(mailto:info@example.com)')
    expect(result).toContain('(//cdn.example.com/x)')
  })

  it('leaves relative links as given when no site URL is known', () => {
    const result = renderLlmsTxt({
      title: 'T',
      sections: [{ title: 'S', links: [{ title: 'Home', url: '/' }] }],
    })
    expect(result).toContain('- [Home](/)')
  })
})
