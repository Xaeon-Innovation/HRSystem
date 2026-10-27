# `@hr/i18n`

Shared Polara locale dictionaries.

| Export | Purpose |
|---|---|
| `ar` | Web Arabic table (English source string → Arabic). Used by `apps/web`. |
| `appEn` / `appAr` / `tApp` | Mobile structured `app.*` keys |
| `translateWebKey` | Helper for English-key style lookups |

## Web wiring

`apps/web/src/i18n/ar.ts` re-exports `ar` from this package. `t.ts` is unchanged.

## Mobile

Import `appEn` / `appAr` or `tApp` from `@hr/i18n` / `@hr/i18n/app`. Expand keys as screens land (Phase 3+).
