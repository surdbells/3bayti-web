import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

/**
 * Home page — the canonical "/" route.
 *
 * Phase 1 mission: be a real, server-rendered, indexable page. Sets a
 * title, meta description, OG/Twitter tags, and (in a future commit)
 * an Organization JSON-LD. The visible content is a hero + brief
 * "coming soon" message — enough to confirm SSR works end-to-end
 * without being an empty stub when shared on social.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  private title = inject(Title);
  private meta = inject(Meta);

  constructor() {
    /* Title + description set in the constructor so they appear in the
       SSR'd HTML. The Meta service is SSR-safe and Angular Universal
       picks these up for the response sent to crawlers. */
    this.title.setTitle('3bayti — Premium Abayas, Kaftans & Modest Wear');
    const description = 'Discover handcrafted abayas, kaftans, and modest wear from independent designers across the UAE. Curated styles, made-to-measure fits, delivered to your door.';

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'theme-color', content: '#5a3a2c' });

    /* Open Graph */
    this.meta.updateTag({ property: 'og:title', content: '3bayti — Premium Abayas, Kaftans & Modest Wear' });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:locale', content: 'en_AE' });

    /* Twitter Cards */
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: '3bayti — Premium Abayas, Kaftans & Modest Wear' });
    this.meta.updateTag({ name: 'twitter:description', content: description });
  }
}
