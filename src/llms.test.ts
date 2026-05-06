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
})
