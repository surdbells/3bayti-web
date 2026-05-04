import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { SeoService } from '../../core/seo/seo.service';
import { organizationSchema, websiteSchema } from '../../core/seo/schema.helpers';
import { environment } from '../../../environments/environment';

/**
 * Home page — the canonical "/" route.
 *
 * Mission: be a real, server-rendered, indexable page. Sets full SEO
 * meta + injects the site-level Organization and WebSite JSON-LD
 * blocks (these establish the brand identity for search engines and
 * enable Google's sitelinks search box once the search route is built
 * in Phase 2).
 */
@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  private seo = inject(SeoService);

  constructor() {
    const siteUrl = environment.SITE_URL;

    /* Per-page SEO. Idempotent — calling set() updates in place. */
    this.seo.set({
      title: 'Premium Abayas, Kaftans & Modest Wear',
      description:
        'Discover handcrafted abayas, kaftans, and modest wear from independent ' +
        'designers across the UAE. Curated styles, made-to-measure fits, delivered ' +
        'to your door.',
      url: `${siteUrl}/`,
      type: 'website',
      titleSuffix: false,  // home title doesn't need " | 3bayti" appended
    });

    /* Organization + WebSite schema — injected once on the home page so
       search engines associate the brand identity with the root URL.
       The search box action will start working once /search ships in
       Phase 2. */
    this.seo.setStructuredData([
      organizationSchema({
        name: '3bayti',
        url: `${siteUrl}/`,
        logo: `${siteUrl}/logo-1200.png`,
        sameAs: [
          // Add social profile URLs here as they're created
        ],
      }),
      websiteSchema({
        name: '3bayti',
        url: `${siteUrl}/`,
        searchUrlTemplate: `${siteUrl}/search?q={search_term_string}`,
      }),
    ]);
  }
}
