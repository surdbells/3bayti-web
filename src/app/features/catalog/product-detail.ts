import {
  Component,
  ChangeDetectionStrategy,
  inject,
  PLATFORM_ID,
  TransferState,
  makeStateKey,
  computed,
  signal,
  effect,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, tap } from 'rxjs';

import { SeoService } from '../../core/seo/seo.service';
import { ApiConfigService } from '../../core/api/api-config.service';
import { environment } from '../../../environments/environment';
import {
  ContainerComponent,
  HeadingComponent,
  TextComponent,
  StackComponent,
} from '../../shared/ui';
import type { Money, ProductDetail } from './product.model';

/**
 * Product detail page (PDP) — `/product/:slug`.
 *
 * THIS IS THE SEO TARGET PAGE. Every product gets its own server-
 * rendered HTML page with full content visible to crawlers without
 * JavaScript. Bottom-of-funnel — these are the pages that need to
 * rank for "{vendor} {product name}", "{category} from {vendor}",
 * and brand-name + product-name search queries.
 *
 * Prerender strategy:
 *   /v2/products?limit=200&sort=newest at build time → prerender 200
 *   most recent products. The remaining ~1,457 products work via
 *   runtime SSR — slower first paint but still fully indexable.
 *   Build time stays under 5 minutes.
 *   See app.routes.server.ts for the cap.
 *
 * What's in W2.2a (this commit):
 *   - Image gallery (primary + thumbnails)
 *   - Title, vendor, price (with sale strike-through)
 *   - Sizes + colors display
 *   - Description (HTML stripped to plain text — no XSS risk)
 *   - Stock state
 *   - Visual breadcrumb (Home › Categories › {category} › {product})
 *   - Basic SEO meta (title, description, canonical, OG)
 *
 * Deferred to W2.2b:
 *   - schema.org Product JSON-LD (the big SEO win)
 *   - BreadcrumbList JSON-LD
 *   - Reviews section UI
 *   - Related products grid (data is fetched, just not rendered)
 *   - Aggregate rating display
 */
@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    ContainerComponent,
    HeadingComponent,
    TextComponent,
    StackComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetailComponent {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfigService);
  private seo = inject(SeoService);
  private state = inject(TransferState);
  private platformId = inject(PLATFORM_ID);

  /**
   * Product detail fetched from /v2/products/:slug.
   * Embeds in TransferState for SSR-to-client hand-off.
   */
  readonly product = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const slug = params.get('slug') ?? '';
        if (!slug) return of(null);
        return this.fetchProduct$(slug);
      }),
    ),
    { initialValue: null as ProductDetail | null },
  );

  /** True between route change and data arrival. */
  readonly loading = computed(() => this.product() === null && !this.notFound());

  /** True if the API returned 404 for this slug. */
  readonly notFound = signal(false);

  /** Currently-displayed image (clicking thumbnails switches it). */
  readonly activeImageIndex = signal(0);

  readonly activeImage = computed(() => {
    const p = this.product();
    if (!p) return null;
    const images = p.images ?? [];
    const fallback = p.primary_image;
    return images[this.activeImageIndex()] ?? fallback;
  });

  /**
   * Description as plain text. Source data contains HTML (<div>, <span>,
   * etc.) which we strip server-side-equivalent — no innerHTML, no XSS
   * vector, no risk of an editor injecting <script>. The description
   * isn't rich content; just product copy. Plain text is fine.
   *
   * Splits on double-line-break (or <br><br>, common in CMS output)
   * to produce paragraphs.
   */
  readonly descriptionParagraphs = computed<string[]>(() => {
    const raw = this.product()?.description ?? '';
    if (!raw) return [];

    /* Decode HTML entities (&#8212; → em-dash, &nbsp; → space). */
    const decoded = raw
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    /* Convert structural breaks into paragraph delimiters BEFORE
       stripping tags. */
    const withBreaks = decoded
      .replace(/<\/(?:div|p|h[1-6]|li|tr)>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n');

    /* Strip all remaining tags. */
    const stripped = withBreaks.replace(/<[^>]+>/g, '');

    /* Split into paragraphs, trim, drop empties. */
    return stripped
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  });

  /** True if there's a sale_price LOWER than regular price. */
  readonly isOnSale = computed(() => {
    const p = this.product();
    if (!p?.sale_price?.amount) return false;
    return p.sale_price.amount < p.price.amount;
  });

  /**
   * Aggregate rating to display, or null if there's nothing meaningful
   * to show. Used by both the visible star block and (W2.2b Phase 2)
   * the schema.org JSON-LD AggregateRating — both must reflect the
   * same numbers, which is why this is a single source of truth.
   *
   * Returns null when:
   *   - product hasn't loaded yet
   *   - rating is null/undefined (no rating data at all)
   *   - review_count is 0 or missing (no reviews → showing a 0-star
   *     widget would be visually misleading)
   *
   * Google's structured-data guidelines also reject AggregateRating
   * without a positive reviewCount, so this null guard protects both
   * surfaces simultaneously.
   */
  readonly aggregateRating = computed<{ value: number; count: number } | null>(() => {
    const p = this.product();
    if (!p) return null;
    const value = p.rating;
    const count = p.review_count ?? 0;
    if (value == null || count <= 0) return null;
    return { value, count };
  });

  /**
   * Static array used by the template to render star icons. Five
   * positions; the template fills/empties each based on whether the
   * average rating reaches that position. Sourced once here so the
   * template stays declarative.
   */
  readonly starPositions = [1, 2, 3, 4, 5] as const;

  /** Computed page title — fed to SeoService AND displayed in <title>. */
  readonly pageTitle = computed(() => {
    const p = this.product();
    if (!p) return null;
    const vendor = p.vendor?.name;
    return vendor ? `${p.name} by ${vendor}` : p.name;
  });

  constructor() {
    /* Apply SEO via effect() so it runs within Angular's CD cycle.
       During SSR prerender, this ensures meta tags are present in the
       captured HTML. (Microtask-based scheduling does NOT work for
       prerender — see CategoryDetailComponent commit history for
       background.) */
    effect(() => {
      const p = this.product();
      if (!p) return;

      const siteUrl = environment.SITE_URL;
      const url = `${siteUrl}/product/${p.slug}`;

      /* Description summary: first paragraph, truncated, plain text. */
      const summary = (this.descriptionParagraphs()[0] ?? '')
        .slice(0, 160)
        .trim();
      const fallback = p.vendor?.name
        ? `${p.name} by ${p.vendor.name}. Premium modest wear from independent UAE designers on 3bayti.`
        : `${p.name}. Premium modest wear from independent UAE designers on 3bayti.`;

      this.seo.set({
        title: this.pageTitle() ?? p.name,
        description: summary || fallback,
        url,
        type: 'product',
        image: p.primary_image?.url ?? p.images?.[0]?.url,
      });

      /* JSON-LD schema.org Product is deferred to W2.2b — that's the
         major SEO payoff and warrants its own focused commit. */
    });
  }

  /**
   * Fetch product detail with TransferState caching.
   */
  private fetchProduct$(slug: string) {
    const stateKey = makeStateKey<ProductDetail>(`product-detail-${slug}`);

    const cached = this.state.get(stateKey, null);
    if (cached !== null) {
      this.notFound.set(false);
      return of(cached);
    }

    const url = `${this.apiConfig.v2BaseUrl}/products/${slug}`;
    return this.http.get<{ data: ProductDetail }>(url).pipe(
      map((envelope) => envelope.data),
      tap((product) => {
        if (isPlatformServer(this.platformId)) {
          this.state.set(stateKey, product);
        }
        this.notFound.set(false);
      }),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.notFound.set(true);
        } else {
          console.error(`[/product/${slug}] fetch failed:`, err.status);
        }
        return of(null as unknown as ProductDetail);
      }),
    );
  }

  /** Click handler for thumbnail switching. */
  selectImage(index: number): void {
    this.activeImageIndex.set(index);
  }

  /** Keyboard handler for thumbnail buttons (Enter/Space). */
  onThumbnailKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectImage(index);
    }
  }

  /** Format Money (AED 530.00 → "AED 530"). */
  formatMoney(money: Money): string {
    const amount = Number(money.amount);
    const isInt = Number.isInteger(amount);
    const formatted = isInt
      ? amount.toLocaleString('en-AE')
      : amount.toLocaleString('en-AE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
    return `${money.currency} ${formatted}`;
  }

  /** Letter for the image-fallback case. */
  initial(): string {
    return (this.product()?.name?.[0] ?? '?').toUpperCase();
  }

  /**
   * Returns the fill ratio (0–1) for the star at the given 1-based
   * position, given the current aggregate rating. Lets the template
   * render half-filled stars when the rating isn't a whole number.
   *
   * Examples (rating = 4.6):
   *   pos 1 → 4.6 − 0 = 4.6, clamped → 1.0 (full)
   *   pos 4 → 4.6 − 3 = 1.6, clamped → 1.0 (full)
   *   pos 5 → 4.6 − 4 = 0.6, clamped → 0.6 (60% filled)
   *   pos 5 with rating = 3 → 3 − 4 = −1, clamped → 0.0 (empty)
   */
  starFillFor(position: number): number {
    const rating = this.aggregateRating()?.value ?? 0;
    return Math.max(0, Math.min(1, rating - (position - 1)));
  }

  /**
   * Grammatically correct review count text: "1 review" vs "5 reviews".
   * Saves the template from inline conditionals.
   */
  reviewCountLabel(count: number): string {
    return count === 1 ? '1 review' : `${count} reviews`;
  }

  /**
   * Formats a review's ISO `created_at` to a short, locale-aware date.
   * Returns null when the field is null/empty so the template can omit
   * the date entirely (some reviews in the dataset have no date).
   */
  formatReviewDate(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    /* en-AE locale matches the rest of the site (en-AE for currency,
       ditto for dates). */
    return date.toLocaleDateString('en-AE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /** Alt text for the active image. Falls back to product name. */
  activeImageAlt(): string {
    return this.activeImage()?.alt
      || this.product()?.name
      || 'Product image';
  }

  /** URL for the category breadcrumb link. */
  categoryUrl(): string | null {
    const slug = this.product()?.category_slug;
    return slug ? `/category/${slug}` : null;
  }

  /** URL for the vendor breadcrumb link. */
  vendorUrl(): string | null {
    const slug = this.product()?.vendor?.slug;
    return slug ? `/designer/${slug}` : null;
  }
}
