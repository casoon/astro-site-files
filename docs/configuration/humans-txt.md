---
title: humans.txt
description: Team, thanks and technology credits in the humanstxt.org layout.
order: 6
---

Off by default. Written when `humans` is set; `humans: true` writes a file with only the date.

## Options

```ts
interface HumansOptions {
  team?: HumansTeamMember[]
  thanks?: string[]
  technology?: string[]
  note?: string
  /** Defaults to today's date */
  lastUpdate?: string | Date
}

interface HumansTeamMember {
  name: string
  role?: string
  twitter?: string
  location?: string
  email?: string
}
```

| Option | Section |
| --- | --- |
| `team` | `/* TEAM */`, one block per member |
| `thanks` | `/* THANKS */`, one line per entry |
| `lastUpdate` | `/* SITE LAST UPDATED */`, default: build date (`YYYY-MM-DD`, UTC) |
| `technology` | `/* TECHNOLOGY COLOPHON */`, comma-separated |
| `note` | `/* NOTE */` |

## Example

```ts
siteFiles({
  humans: {
    team: [{ name: 'Alice', role: 'Development', location: 'Berlin' }],
    thanks: ['Everyone who reported a bug'],
    technology: ['Astro', 'TypeScript'],
    note: 'Built with care.',
    lastUpdate: '2026-09-01',
  },
})
```

```text
/* TEAM */
    Name: Alice
    Role: Development
    Location: Berlin

/* THANKS */
    Everyone who reported a bug

/* SITE LAST UPDATED */
    2026-09-01

/* TECHNOLOGY COLOPHON */
    Astro, TypeScript

/* NOTE */
    Built with care.
```

## Audit hints

`humans/no-team` and `humans/no-technology` (both `info`). See
[build-time audit](../../guides/audit/).
