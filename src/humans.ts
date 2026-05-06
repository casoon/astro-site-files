import type { HumansOptions } from './types.js'

export function renderHumansTxt(options: HumansOptions): string {
  const sections: string[] = []

  if (options.team?.length) {
    const lines = ['/* TEAM */']
    for (const member of options.team) {
      lines.push(`    Name: ${member.name}`)
      if (member.role) lines.push(`    Role: ${member.role}`)
      if (member.twitter) lines.push(`    Twitter: ${member.twitter}`)
      if (member.location) lines.push(`    Location: ${member.location}`)
      if (member.email) lines.push(`    Email: ${member.email}`)
    }
    sections.push(lines.join('\n'))
  }

  if (options.thanks?.length) {
    const lines = ['/* THANKS */']
    for (const entry of options.thanks) {
      lines.push(`    ${entry}`)
    }
    sections.push(lines.join('\n'))
  }

  const lastUpdate = options.lastUpdate
    ? options.lastUpdate instanceof Date
      ? options.lastUpdate.toISOString().split('T')[0]
      : options.lastUpdate
    : new Date().toISOString().split('T')[0]

  sections.push(`/* SITE LAST UPDATED */\n    ${lastUpdate}`)

  if (options.technology?.length) {
    sections.push(`/* TECHNOLOGY COLOPHON */\n    ${options.technology.join(', ')}`)
  }

  if (options.note) {
    sections.push(`/* NOTE */\n    ${options.note}`)
  }

  return sections.join('\n\n') + '\n'
}
