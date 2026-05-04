# 3bayti Web

The SEO-optimized public website for **3bayti**, the premium abaya/kaftan/modest-wear marketplace. Counterpart to the [3bayti mobile app](https://github.com/surdbells/abayti_app) — shares the brand, business, and APIs, but has its own UI codebase tailored for the web.

## Status

**Phase 1 (Weeks 1–3): Foundation + tooling.** Currently shipping the home page with full SSR + SEO scaffolding. Catalog, product, cart, account, and checkout flows arrive in Phases 2–4.

## Stack

- **Angular 21** with built-in SSR (`@angular/ssr`) — same major version as the mobile app
- **Tailwind CSS 4** (PostCSS-based) for utility-first styling
- **Standalone components** + signal-based state where applicable
- **TypeScript strict mode**

## Project structure

```
src/
├── app/
│   ├── core/             # cross-cutting concerns: API client, SEO service
│   │   ├── api/          # API constants (auto-generated from mobile app)
│   │   └── seo/          # Title, meta, OG, JSON-LD helpers
│   ├── features/         # route-owning feature components (home, category, product, …)
│   │   └── home/
│   ├── layout/           # persistent layout: header, footer
│   │   ├── header/
│   │   └── footer/
│   ├── shared/           # generic UI primitives (buttons, headings, etc.)
│   ├── app.ts            # root shell component
│   ├── app.routes.ts     # client-side route table
│   └── app.routes.server.ts  # server-side prerender config
├── styles.scss           # global tokens + Tailwind import
├── index.html            # SEO defaults (title, meta, OG, fonts)
├── server.ts             # Express SSR entry (only for runtime SSR; we prerender for prod)
├── main.ts               # client entry
└── main.server.ts        # server entry
```

## Local development

Prereqs: Node 20+, npm 10+.

```bash
npm install
npm start              # http://localhost:4200 with HMR
```

## Production build

```bash
npm run build          # outputs to dist/3bayti-web/
```

The build produces:
- `dist/3bayti-web/browser/` — static assets (HTML, CSS, JS, fonts) — what gets deployed
- `dist/3bayti-web/server/` — Node SSR runtime (used for routes that opt into runtime SSR rather than prerender)

## Deploy

Hosting: **Cloudflare Pages** (static site, prerendered at build time — no Workers/SSR runtime needed).

### Initial setup (one-time)

1. Sign in to [Cloudflare dash](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git**
2. Select the `surdbells/3bayti-web` repo (you may need to install the Cloudflare GitHub app and grant access)
3. **Configure build settings:**

   | Setting | Value |
   |---|---|
   | Framework preset | None (or Angular if listed — both work) |
   | Build command | `npm run build` |
   | Build output directory | `dist/3bayti-web/browser` |
   | Root directory (advanced) | leave blank |
   | Node version (env var) | `NODE_VERSION=22` |
   | Site URL (env var) | `SITE_URL=https://staging.3bayti.ae` |

   **About `SITE_URL`:** this drives every canonical link, OG meta URL, sitemap entry, and JSON-LD URL on the site. Set it to whatever domain Cloudflare is serving from. When you migrate from `staging.3bayti.ae` to `3bayti.ae`, change this env var in the Cloudflare dashboard and redeploy — no code change needed. If unset, the build defaults to `https://staging.3bayti.ae`.

4. **Production branch:** `master`
5. Click **Save and Deploy**

After the first deploy, Cloudflare gives you a URL like `https://3bayti-web.pages.dev`. That's the live preview.

### Subsequent deploys

Every push to `master` triggers a Cloudflare deploy automatically. PRs get preview URLs (`https://<branch>.3bayti-web.pages.dev`).

The repo's GitHub Actions workflow (`.github/workflows/ci.yml`) runs `npm ci && npm run build` on every push and PR — independent of Cloudflare's build, so PRs don't merge with broken builds.

### Custom domain (interim: staging.3bayti.ae, eventual: 3bayti.ae)

To hook up a custom domain:

1. Cloudflare dash → your Pages project → **Custom domains** → **Set up a custom domain**
2. Enter `web.3bayti.ae`
3. Cloudflare auto-creates the CNAME (since `3bayti.ae` is on Cloudflare DNS)
4. SSL cert provisioned automatically — usually live in <1 minute

### Cloudflare-specific config files

The repo's `public/` directory contains:

- **`_headers`** — per-route HTTP headers (security, caching). Hashed assets get 1-year immutable cache; HTML pages get 5-min CDN cache + 24-hour stale-while-revalidate.
- **`_redirects`** — URL redirects. Empty for now; we'll add as URLs evolve.

Cloudflare reads these files automatically from the build output. No additional config needed in the dashboard.

### Build output structure

```
dist/3bayti-web/
├── browser/        ← deployed to Cloudflare Pages (static files)
│   ├── index.html  ← prerendered home page (full DOM, SEO-ready)
│   ├── _dev/components/index.html
│   ├── sitemap.xml ← generated by postbuild hook
│   ├── robots.txt
│   ├── _headers    ← Cloudflare reads this
│   ├── main-*.js   ← hashed entry chunk
│   └── styles-*.css
└── server/         ← NOT deployed (kept for future runtime SSR if we add it)
```

## SEO checklist

- [x] SSR / prerendering (no JS-only content for crawlers)
- [x] `<title>` + meta description per route via Angular's Meta service
- [x] Open Graph + Twitter Card tags
- [x] Canonical URLs
- [x] `sitemap.xml` (W1.4 — generated at build via postbuild hook)
- [x] `robots.txt` (W1.4)
- [x] JSON-LD: Organization + WebSite on home (W1.4) — Product on PDPs in Phase 2
- [ ] hreflang for ar/en (Phase 2)
- [ ] Lighthouse ≥ 90 on Performance + SEO (W1.9 close-out)

## Roadmap

| Phase | Focus | Weeks |
|-------|-------|-------|
| 1 | Foundation: SSR, SEO scaffolding, hosting, CI/CD, home page | 1–3 |
| 2 | Catalog: category listings, product detail, search | 4–7 |
| 3 | Commerce: auth, cart, checkout, orders, account | 8–11 |
| 4 | Post-purchase: tracking, messages, support, vendor pages | 12–14 |
| 5 | Polish + SEO push: Core Web Vitals, content, schema validation | 15–18 |

See `docs/PHASE_1_PLAN.md` (TBD) for the detailed Phase 1 plan.

## License

Proprietary — © 2026 DOST HQ Limited / 3bayti. All rights reserved.
