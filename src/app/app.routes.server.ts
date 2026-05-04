import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Server-side route configuration for Angular SSR.
 *
 * The default rule (`'**' → Prerender`) handles every static route.
 * For routes with parameters (`/category/:slug`, eventually
 * `/product/:slug`, `/designer/:slug`), we explicitly list which
 * parameter values to prerender via `getPrerenderParams`.
 *
 * `getPrerenderParams` runs ONCE at build time, on the build machine.
 * It receives no per-request context — it's pure data fetching for
 * the prerender phase.
 */

const API_BASE = process.env['API_BASE_URL'] || 'https://api.3bayti.ae/v2';

/**
 * Fetch every category slug at build time. Used by the prerender
 * provider for /category/:slug.
 *
 * Failure handling: if the API is unreachable, return an empty list
 * so the build doesn't blow up. Cloudflare Pages would deploy without
 * the category-detail pages prerendered, and they'd 404 until the
 * next successful build. Better than a hard build failure.
 */
async function fetchCategorySlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) {
      console.warn(`[SSR] /categories returned ${res.status}; skipping category-detail prerender`);
      return [];
    }
    const json = await res.json() as { data: Array<{ slug: string }> };
    const slugs = (json.data ?? []).map((c) => c.slug).filter(Boolean);
    console.log(`[SSR] Prerendering /category/:slug for ${slugs.length} categories: ${slugs.join(', ')}`);
    return slugs;
  } catch (err) {
    console.warn(`[SSR] fetchCategorySlugs failed:`, err instanceof Error ? err.message : err);
    return [];
  }
}

export const serverRoutes: ServerRoute[] = [
  {
    /* Category detail — prerender every existing category slug at
       build time. As of W2.0 there are 8 categories; this number
       grows naturally as new categories are added without code
       changes (build-time fetch picks them up). */
    path: 'category/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const slugs = await fetchCategorySlugs();
      return slugs.map((slug) => ({ slug }));
    },
  },
  {
    /* Default: prerender everything else at build time. */
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
