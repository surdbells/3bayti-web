import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home';

/**
 * Top-level route table for the public web app.
 *
 * Phase 1: just the home page. Phase 2 adds /category, /category/:slug,
 * /product/:slug, /search. All routes are SSR'd by default; route-level
 * data resolvers will fetch from the API server-side.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: HomeComponent,
    title: '3bayti — Premium Abayas, Kaftans & Modest Wear',
  },
];
