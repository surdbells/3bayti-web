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

Targeting **Cloudflare Pages**. The CI/CD pipeline (Phase 1.8) will build on every push to `main` and deploy automatically.

Build output directory: `dist/3bayti-web/browser`
Build command: `npm run build`

## SEO checklist

- [x] SSR / prerendering (no JS-only content for crawlers)
- [x] `<title>` + meta description per route via Angular's Meta service
- [x] Open Graph + Twitter Card tags
- [x] Canonical URLs
- [ ] `sitemap.xml` (Phase 1.4)
- [ ] `robots.txt` (Phase 1.4)
- [ ] JSON-LD: Organization on home, Product on PDPs (Phase 1.4 + 2)
- [ ] hreflang for ar/en (Phase 2)
- [ ] Lighthouse ≥ 90 on Performance + SEO (Phase 1.9 close-out)

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
