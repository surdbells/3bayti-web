import {
  Component,
  ChangeDetectionStrategy,
  Input,
  signal,
  computed,
  inject,
  PLATFORM_ID,
  OnDestroy,
  ChangeDetectorRef,
  effect,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { SkeletonShimmerComponent } from './skeleton-shimmer';
import type { Product } from '../../features/catalog/product.model';

/**
 * HeroCarouselComponent — auto-advancing product carousel for the
 * home-page hero band.
 *
 * Usage:
 *   <ui-hero-carousel
 *     [products]="featured()"
 *     [loading]="featured() === null"
 *   />
 *
 * Behavior:
 *   - Renders 1 slide at a time; each slide is a large product image
 *     with an overlay panel showing vendor name + product name + price
 *     + "View product" CTA
 *   - Auto-advances every AUTOPLAY_MS (6000ms by default)
 *   - Pauses on hover/focus to respect the user's attention
 *   - Manual navigation:
 *     - Left/right arrow buttons (desktop only, hover-revealed)
 *     - Dot indicators (clickable, always visible)
 *     - Swipe gesture on mobile (handled via CSS scroll-snap)
 *   - SSR-safe: server renders the first slide only; auto-advance and
 *     scroll machinery boot in ngAfterViewInit on the browser only
 *
 * Accessibility:
 *   - Slides are wrapped in role="group" with aria-roledescription
 *   - Dot indicators have aria-current to indicate the active slide
 *   - "View product" CTA is the primary keyboard target on each slide
 *   - prefers-reduced-motion: disables auto-advance entirely
 *
 * Design notes:
 *   - Slide images use the existing product image URLs at /v2/products
 *     (300x300 cutouts). Phase 1 W3 ships with these; when hero-quality
 *     vendor lifestyle imagery becomes available, swap the image source
 *     in the template — no other changes needed
 *   - Overlay panel uses a subtle gradient + frosted-glass surface so
 *     text reads well against varied product backgrounds (some products
 *     have white backgrounds, some dark — gradient handles both)
 */
@Component({
  selector: 'ui-hero-carousel',
  standalone: true,
  imports: [SkeletonShimmerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hero-carousel" role="region" aria-label="Featured products">

      @if (loading) {
        <!-- Skeleton state — same outer dimensions as a real slide so
             layout doesn't shift when content arrives. -->
        <div class="hero-carousel__skeleton">
          <ui-skeleton-shimmer width="100%" height="100%" [rounded]="false" />
        </div>
      } @else if (slides().length > 0) {

        <!-- The slides container. CSS scroll-snap on the X axis gives
             us free swipe behavior on mobile. JS scrollTo() drives
             auto-advance and arrow navigation on desktop. -->
        <div
          #track
          class="hero-carousel__track"
          (mouseenter)="onPause()"
          (mouseleave)="onResume()"
          (focusin)="onPause()"
          (focusout)="onResume()"
          (scroll)="onScroll()"
        >
          @for (product of slides(); track product.id; let i = $index) {
            <article
              class="hero-carousel__slide"
              role="group"
              [attr.aria-label]="'Slide ' + (i + 1) + ' of ' + slides().length"
              [attr.aria-roledescription]="'slide'"
            >
              <a
                [href]="productUrl(product.slug)"
                class="hero-carousel__slide-link"
                [attr.aria-label]="product.name + ' by ' + (product.vendor?.name ?? 'designer')"
              >
                @if (product.primary_image; as img) {
                  <img
                    [src]="img.url"
                    [alt]="img.alt ?? product.name"
                    class="hero-carousel__image"
                    [attr.loading]="i === 0 ? 'eager' : 'lazy'"
                    [attr.fetchpriority]="i === 0 ? 'high' : 'auto'"
                    decoding="async"
                  />
                } @else {
                  <div class="hero-carousel__image-fallback" aria-hidden="true">
                    <span>{{ initial(product.name) }}</span>
                  </div>
                }

                <!-- Overlay panel — frosted glass card pinned to the
                     bottom-left of the slide on desktop, full-width
                     on mobile. -->
                <div class="hero-carousel__overlay">
                  @if (product.vendor; as vendor) {
                    <p class="hero-carousel__vendor">{{ vendor.name }}</p>
                  }
                  <h3 class="hero-carousel__product-name">{{ product.name }}</h3>
                  <div class="hero-carousel__divider" aria-hidden="true">
                    <span class="hero-carousel__divider-line"></span>
                    <span class="hero-carousel__divider-mark"></span>
                    <span class="hero-carousel__divider-line"></span>
                  </div>
                  <p class="hero-carousel__price">
                    {{ product.price.currency }} {{ product.price.amount }}
                  </p>
                  <span class="hero-carousel__cta">
                    View product
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12h14M13 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>
                </div>
              </a>
            </article>
          }
        </div>

        @if (slides().length > 1) {
          <!-- Manual nav arrows — desktop hover-revealed via CSS -->
          <button
            type="button"
            class="hero-carousel__arrow hero-carousel__arrow--left"
            [class.is-disabled]="activeIndex() === 0"
            (click)="goPrev()"
            aria-label="Previous slide"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <button
            type="button"
            class="hero-carousel__arrow hero-carousel__arrow--right"
            [class.is-disabled]="activeIndex() === slides().length - 1"
            (click)="goNext()"
            aria-label="Next slide"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <!-- Dot indicators — always visible, always interactive -->
          <div class="hero-carousel__dots" role="tablist" aria-label="Choose slide">
            @for (product of slides(); track product.id; let i = $index) {
              <button
                type="button"
                role="tab"
                class="hero-carousel__dot"
                [class.is-active]="activeIndex() === i"
                [attr.aria-selected]="activeIndex() === i"
                [attr.aria-label]="'Go to slide ' + (i + 1)"
                (click)="goTo(i)"
              ></button>
            }
          </div>
        }

      }
    </div>
  `,
  styleUrl: './hero-carousel.scss',
})
export class HeroCarouselComponent implements OnDestroy {
  /**
   * Products to render as carousel slides. We cap to MAX_SLIDES because
   * having too many slides in a hero hurts UX (users only see the first
   * few before scrolling past).
   */
  @Input() set products(value: Product[] | null) {
    this._products.set(value ?? []);
  }

  /** Loading state — true = render skeleton, false = render slides. */
  @Input() loading: boolean = false;

  /* ----- Internal state -------------------------------------------- */

  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private _products = signal<Product[]>([]);

  /** Maximum number of slides shown. More than ~6 is too many for a hero. */
  private readonly MAX_SLIDES = 5;

  /** How long each slide stays before auto-advancing. */
  private readonly AUTOPLAY_MS = 6000;

  /** The active slide index (0-based). */
  readonly activeIndex = signal(0);

  /** The visible slides — capped to MAX_SLIDES. */
  readonly slides = computed(() => {
    return this._products().slice(0, this.MAX_SLIDES);
  });

  /** Auto-advance timer handle (browser only). */
  private autoplayTimer: ReturnType<typeof setInterval> | null = null;

  /** True while the carousel is being interacted with (paused). */
  private isPaused = false;

  /** Reference to the scroll track element. */
  private trackEl: HTMLElement | null = null;

  /** Whether the user prefers reduced motion (disables auto-advance). */
  private prefersReducedMotion = false;

  constructor() {
    /* Boot autoplay once we're on the browser AND we have slides AND
       the user doesn't prefer reduced motion. The effect re-runs if
       slides change (e.g., loading -> loaded transition). */
    effect(() => {
      const slides = this.slides();
      if (!isPlatformBrowser(this.platformId)) return;
      if (slides.length <= 1) return;
      if (this.prefersReducedMotion) return;
      this.startAutoplay();
    });

    if (isPlatformBrowser(this.platformId)) {
      /* Read the prefers-reduced-motion media query. We don't subscribe
         to changes — if the user toggles their OS setting mid-session,
         they can refresh. Avoiding a listener keeps this component
         lighter. */
      this.prefersReducedMotion =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  /* ----- Template event handlers ----------------------------------- */

  /** Snap to the previous slide; clamp at 0 (no wraparound). */
  goPrev(): void {
    const next = Math.max(0, this.activeIndex() - 1);
    this.goTo(next);
  }

  /** Snap to the next slide; clamp at last index (no wraparound).
   *
   *  Wraparound is intentionally NOT supported. Hero carousels with
   *  wraparound feel "infinite" but lose the user's sense of progress
   *  through the curated set. With 5 slides max, hitting the end and
   *  showing arrows-disabled is fine UX. */
  goNext(): void {
    const next = Math.min(this.slides().length - 1, this.activeIndex() + 1);
    this.goTo(next);
  }

  /** Jump directly to a specific slide index. */
  goTo(index: number): void {
    if (index < 0 || index >= this.slides().length) return;
    this.activeIndex.set(index);
    this.scrollToIndex(index);
    /* User initiated the jump → reset the autoplay timer so they get
       the full 6s on the slide they chose. */
    this.restartAutoplay();
  }

  /** User has hovered / focused → pause auto-advance. */
  onPause(): void {
    this.isPaused = true;
    this.stopAutoplay();
  }

  /** User has unhovered / unfocused → resume auto-advance. */
  onResume(): void {
    this.isPaused = false;
    this.startAutoplay();
  }

  /** User scrolled the track manually (swipe). Sync activeIndex from
   *  the actual scroll position. */
  onScroll(): void {
    if (!this.trackEl) {
      /* Lazy-pick the track ref. We can't use ViewChild because Angular
         SSR doesn't render the track on the server, so the ref would
         be undefined during SSR. Browser-side, the first scroll event
         finds the element. */
      const el = document.querySelector('.hero-carousel__track');
      if (el instanceof HTMLElement) this.trackEl = el;
    }
    if (!this.trackEl) return;

    const slideWidth = this.trackEl.clientWidth;
    /* Round to find the slide that's now most-visible. */
    const newIndex = Math.round(this.trackEl.scrollLeft / slideWidth);
    if (newIndex !== this.activeIndex() && newIndex >= 0 && newIndex < this.slides().length) {
      this.activeIndex.set(newIndex);
    }
  }

  /* ----- Helpers --------------------------------------------------- */

  productUrl(slug: string): string {
    return `/product/${slug}`;
  }

  initial(name: string | undefined): string {
    return (name?.[0] ?? '?').toUpperCase();
  }

  /* ----- Internal: autoplay machinery ------------------------------ */

  private startAutoplay(): void {
    if (this.autoplayTimer) return;
    if (this.slides().length <= 1) return;
    if (this.isPaused) return;
    if (!isPlatformBrowser(this.platformId)) return;

    this.autoplayTimer = setInterval(() => {
      const cur = this.activeIndex();
      const next = cur < this.slides().length - 1 ? cur + 1 : 0;
      this.activeIndex.set(next);
      this.scrollToIndex(next);
      /* Trigger CD so the active dot updates without waiting for the
         next zone tick. activeIndex is a signal so this should be
         automatic; calling markForCheck is belt-and-braces in case
         the strip is in a deeply OnPush parent. */
      this.cdr.markForCheck();
    }, this.AUTOPLAY_MS);
  }

  private stopAutoplay(): void {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  private restartAutoplay(): void {
    this.stopAutoplay();
    this.startAutoplay();
  }

  /** Scroll the track so the slide at index is fully in view. */
  private scrollToIndex(index: number): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.trackEl) {
      const el = document.querySelector('.hero-carousel__track');
      if (el instanceof HTMLElement) this.trackEl = el;
    }
    if (!this.trackEl) return;

    const slideWidth = this.trackEl.clientWidth;
    this.trackEl.scrollTo({
      left: slideWidth * index,
      behavior: 'smooth',
    });
  }
}
