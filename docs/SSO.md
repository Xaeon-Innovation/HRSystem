# Single sign-on (planned)

HR Track does **not** implement OIDC login yet. This document describes the intended Google / Microsoft identity provider integration so env and ops can be prepared ahead of the feature.

## Goals

- Allow tenants to enable Google Workspace and/or Microsoft Entra ID (Azure AD) sign-in for their users.
- Map IdP email (or subject) to an existing `users` row in the tenant; first-login auto-provision is out of scope for the first cut.
- Keep password login available until a tenant opts into SSO-only.

## Planned flow

1. User chooses **Continue with Google** or **Continue with Microsoft** on `/login`.
2. Browser redirects to the IdP authorize URL (authorization code + PKCE).
3. Callback hits the API (e.g. `GET /v1/auth/oidc/callback`), exchanges the code for tokens, validates `id_token`, and issues the usual HR Track access/refresh JWTs.
4. Session continues identically to password login (`/v1/auth/me`, refresh, logout).

## Environment variables (not wired)

Add these when implementing OIDC. They are listed as comments in `.env.example`.

| Variable | Purpose |
|---|---|
| `OIDC_CLIENT_ID` | OAuth client id (Google or Microsoft app registration) |
| `OIDC_CLIENT_SECRET` | OAuth client secret |
| `OIDC_ISSUER` | Discovery issuer URL (e.g. `https://accounts.google.com` or `https://login.microsoftonline.com/{tenant}/v2.0`) |
| `OIDC_REDIRECT_URI` | Must match the IdP app config (e.g. `https://api.example.com/v1/auth/oidc/callback`) |
| `OIDC_SCOPES` | Optional; default `openid email profile` |
| `NEXT_PUBLIC_OIDC_ENABLED` | Web flag to show SSO buttons when the API supports them |

Per-provider overrides (optional later):

- `OIDC_GOOGLE_CLIENT_ID` / `OIDC_GOOGLE_CLIENT_SECRET`
- `OIDC_MICROSOFT_CLIENT_ID` / `OIDC_MICROSOFT_CLIENT_SECRET`
- `OIDC_MICROSOFT_TENANT` (e.g. `common` or a directory id)

## Tenant settings (future)

Tenant admins will toggle SSO in Settings and choose allowed providers. Until then, platform env alone will gate availability.

## Security notes

- Prefer PKCE even for confidential clients.
- Validate `aud`, `iss`, `exp`, and email verified claims before issuing session tokens.
- Do not store IdP refresh tokens in the browser; keep them server-side if needed for directory sync.
- Restrict redirect URIs to known API hosts.

## Status

Stub only, no routes, buttons, or token exchange are implemented.
