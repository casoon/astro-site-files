---
title: security.txt
description: A vulnerability disclosure contact at /.well-known/security.txt per RFC 9116.
order: 5
---

Off by default. Written to `.well-known/security.txt` when `security` has a `contact`.

## Options

```ts
interface SecurityOptions {
  contact: string | string[]
  expires?: string | Date
  encryption?: string
  acknowledgments?: string
  preferredLanguages?: string[]
  canonical?: string
  policy?: string
  hiring?: string
}
```

| Option | Field | Notes |
| --- | --- | --- |
| `contact` | `Contact` | Required. A URI: `mailto:`, `https:` or `tel:`. One line per value. |
| `expires` | `Expires` | Required by RFC 9116. ISO 8601 string, or a `Date` (written as ISO string). |
| `encryption` | `Encryption` | URL of a public key |
| `acknowledgments` | `Acknowledgments` | URL of a hall of fame |
| `preferredLanguages` | `Preferred-Languages` | Joined with `, ` |
| `canonical` | `Canonical` | URL where this file is published |
| `policy` | `Policy` | URL of the disclosure policy |
| `hiring` | `Hiring` | URL of security jobs |

Fields are written in the order of this table.

## Example

```ts
siteFiles({
  security: {
    contact: 'mailto:security@example.com',
    expires: '2027-03-01T00:00:00.000Z',
    preferredLanguages: ['en', 'de'],
    canonical: 'https://example.com/.well-known/security.txt',
    policy: 'https://example.com/security-policy/',
  },
})
```

```text
Contact: mailto:security@example.com
Expires: 2027-03-01T00:00:00.000Z
Preferred-Languages: en, de
Canonical: https://example.com/.well-known/security.txt
Policy: https://example.com/security-policy/
```

## Keeping Expires current

Scanners discard an expired file completely, and RFC 9116 recommends an `Expires` less than a
year ahead. A fixed date has to be renewed by hand; a computed one moves with every build. This
site uses:

```ts
expires: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
```

## Audit hints

`security/contact-not-a-uri`, `security/invalid-expires` and `security/expired` are errors,
`security/no-expires` a warning, `security/no-policy` an info. See
[build-time audit](../../guides/audit/).

The file is written below the build output, i.e. below `base`. Scanners look for it at the host
root; see [site URL and base path](../../guides/site-url-and-base/).
