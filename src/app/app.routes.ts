import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home';

/**
 * Top-level route table for the public web app.
 *
 * Phase 1: home + a dev-only component preview. Phase 2 adds /category,
 * /category/:slug, /product/:slug, /search.
 *
 * All routes are SSR'd by default; route-level data resolvers will
 * fetch from the API server-side as they're added.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: HomeComponent,
    title: '3bayti — Premium Abayas, Kaftans & Modest Wear',
  },
  {
    /* Dev-only component preview. noindex'd via SeoService inside the
       component. Lazy-loaded so it doesn't bloat the production bundle
       for normal users. */
    path: '_dev/components',
    loadComponent: () =>
      import('./features/dev-components/dev-components').then(m => m.DevComponentsComponent),
    title: 'Component preview · 3bayti',
  },
];
