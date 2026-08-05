# Security

## Reporting

Report vulnerabilities privately through GitHub's **Report a vulnerability**
button under the Security tab, or by direct contact with the maintainer. Please
do not open a public issue for a security matter.

Expect an acknowledgement within 72 hours.

## Scope

This is a static marketing site. It has no backend, no database, and no
authentication. The realistic surface is:

- dependency supply chain in the build tooling
- content injection through a compromised deploy token
- misconfigured headers at the hosting layer

## Secrets

No secret is committed. The production domain arrives at build time through the
`SITE_URL` repository variable; deploy credentials live in Actions secrets:

| Name | Type | Used by |
|---|---|---|
| `SITE_URL` | variable | build |
| `NETLIFY_AUTH_TOKEN` | secret | Netlify deploy |
| `NETLIFY_SITE_ID` | secret | Netlify deploy |
| `VERCEL_TOKEN` | secret | Vercel deploy |

## Content integrity

`scripts/check-claims.mjs` runs before every build and before every deploy. It
blocks prohibited health claims, fabricated institutional validation, and
unfilled template placeholders. It is a required gate, not an advisory check —
treat a failure as a stop, not a warning.
