# Blue-Gold Daily — True Melange Φ

[![CI](https://github.com/HeruAhmose/blue-gold-daily/actions/workflows/ci.yml/badge.svg)](https://github.com/HeruAhmose/blue-gold-daily/actions/workflows/ci.yml)
[![Deploy](https://github.com/HeruAhmose/blue-gold-daily/actions/workflows/deploy.yml/badge.svg)](https://github.com/HeruAhmose/blue-gold-daily/actions/workflows/deploy.yml)

Proprietary. All rights reserved. See [LICENSE](LICENSE).

A saffron-hemp ready-to-drink tea. Seven pages, no framework, no build step
beyond domain injection.

## Run

```bash
npm run dev      # serve at :4173
npm run check    # claims guard + links + HTML validity
npm run build    # → dist/, with SITE_URL baked in
```

## The claims guard

`scripts/check-claims.mjs` runs before every build and every deploy, and blocks
both on failure. This is the piece that matters most in this repository.

The claims discipline in the technical package is only worth something if it
survives a hurried copy edit at 11pm. So it is encoded rather than remembered:

- no disease, treatment, or diagnostic claim
- no anti-aging, lifespan, or senolytic claim
- no psychedelic or vision-inducing framing
- hemp stays hempseed-derived only — CBD may appear only inside a negation
- Gardenia blue stays excluded (soy allergen, weaker heat and acid stability)
- `Affron®`, never "Affron-comparable" — Lepticrosalides® is trademarked and
  patent-protected
- no fabricated institutional validation, no unfilled placeholders

It is negation-aware, so the FDA disclaimer keeps its "not intended to
diagnose", the product page keeps "No CBD or THC", and the discipline section
keeps its explanation of why Gardenia blue was excluded. It also checks that
required claims are still *present* — silent removal is a failure too.

Verified in both directions: five injected violations were caught, and the
clean site passes.

## Deploy

Set the `SITE_URL` repository variable, then push to `main` for GitHub Pages,
or run the Deploy workflow and choose Netlify or Vercel. No production URL is
committed — `scripts/build.mjs` injects it into canonical tags, `og:url`,
sitemap, robots, and the ecosystem registry at build time.

| Secret / variable | Type | Needed for |
|---|---|---|
| `SITE_URL` | variable | canonical, og:url, sitemap |
| `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` | secrets | Netlify |
| `VERCEL_TOKEN` | secret | Vercel |

## Still open

Forms validate and give real feedback but store nothing. Netlify Forms needs
one attribute on the `<form>` tag; Formspree or Resend need one `fetch`. The
insertion point is marked in `assets/site.js`.
