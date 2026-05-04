import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Money, Product } from './product.model';

/**
 * ProductCard — single card in a product grid.
 *
 * Used by:
 *   - /category/:slug              (W2.1)
 *   - /product/:slug related grid  (W2.2)
 *   - /designer/:slug storefront   (W2.3)
 *   - /search results              (Phase 3)
 *
 * Renders entirely from a typed Product object. No API calls, no async.
 * SSR-safe (no DOM access, no `window`, no `document`).
 *
 * Defensive design choices:
 *   - Image URL falsy / missing → renders a letter-fallback (same
 *     visual pattern used in /category for category icons)
 *   - vendor missing → vendor row hidden (some products may legitimately
 *     have no vendor in early data)
 *   - sale_price missing or not lower than price → only regular price shown
 *   - rating === null → rating row hidden (don't fake a 0.0)
 *   - in_stock === false → card gets a soft "out of stock" treatment
 *   - product.slug missing or empty → entire card renders without an
 *     anchor (still visible, just not clickable; better than crashing)
 *
 * The card link uses anchor href (not routerLink) because every card on
 * a category page is server-rendered and many won't be hydrated until
 * the user starts interacting. Plain anchors work without JS, which is
 * exactly what crawlers + slow-network mobile users need.
 */
@Component({
  selector: 'ui-product-card',
  standalone: true,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (product) {
      @if (product.slug) {
        <a [href]="productUrl()" class="product-card" [class.is-out-of-stock]="!product.in_stock">
          <ng-container *ngTemplateOutlet="cardBody"></ng-container>
        </a>
      } @else {
        <div class="product-card" [class.is-out-of-stock]="!product.in_stock">
          <ng-container *ngTemplateOutlet="cardBody"></ng-container>
        </div>
      }
    }

    <ng-template #cardBody>
      <div class="product-card-image">
        @if (product?.primary_image?.url) {
          <img
            [src]="product!.primary_image!.url"
            [alt]="imageAlt()"
            loading="lazy"
            decoding="async"
          />
        } @else {
          <!-- Letter fallback: brand-colored circle with first character. -->
          <div class="product-card-fallback" aria-hidden="true">
            <span>{{ initial() }}</span>
          </div>
        }

        <!-- Status pills (top-right corner of image) -->
        @if (product && (product.is_new || product.is_bestseller || isOnSale())) {
          <div class="product-card-pills">
            @if (product.is_new) { <span class="pill pill-new">New</span> }
            @if (product.is_bestseller) { <span class="pill pill-bestseller">Bestseller</span> }
            @if (isOnSale()) { <span class="pill pill-sale">Sale</span> }
          </div>
        }

        @if (product && !product.in_stock) {
          <div class="product-card-stock-overlay">Out of stock</div>
        }
      </div>

      <div class="product-card-meta">
        @if (product?.vendor?.name) {
          <p class="product-card-vendor">{{ product!.vendor!.name }}</p>
        }

        <h3 class="product-card-name">{{ product?.name }}</h3>

        <div class="product-card-price">
          @if (isOnSale() && product?.sale_price) {
            <span class="price-current">{{ formatMoney(product!.sale_price!) }}</span>
            <span class="price-original">{{ formatMoney(product!.price) }}</span>
          } @else if (product) {
            <span class="price-current">{{ formatMoney(product.price) }}</span>
          }
        </div>

        @if (product && product.rating !== null && product.rating !== undefined && product.review_count) {
          <div class="product-card-rating">
            <span class="rating-stars" aria-hidden="true">★</span>
            <span>{{ product.rating.toFixed(1) }}</span>
            <span class="rating-count">({{ product.review_count }})</span>
          </div>
        }
      </div>
    </ng-template>
  `,
  styleUrl: './product-card.scss',
})
export class ProductCardComponent {
  /** The product to render. Null/undefined renders nothing. */
  @Input({ required: true }) product!: Product | null;

  /** Build the canonical /product/:slug URL. */
  productUrl(): string {
    return `/product/${this.product?.slug ?? ''}`;
  }

  /** Alt text for the product image. Falls back to the product name. */
  imageAlt(): string {
    return this.product?.primary_image?.alt
      || this.product?.name
      || 'Product image';
  }

  /** First character for the letter-fallback. */
  initial(): string {
    return (this.product?.name?.[0] ?? '?').toUpperCase();
  }

  /** True if there's a sale_price LOWER than the regular price. */
  isOnSale(): boolean {
    const p = this.product;
    if (!p?.sale_price?.amount) return false;
    return p.sale_price.amount < p.price.amount;
  }

  /**
   * Format a Money value. AED 350.00 → "AED 350" (we drop trailing
   * .00 because integer prices are common). Decimals shown if present.
   */
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
}
