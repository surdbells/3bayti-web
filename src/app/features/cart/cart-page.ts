import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CartService } from './cart.service';
import { SeoService } from '../../core/seo/seo.service';
import type { Money } from '../catalog/product.model';
import type { CartItem } from './cart.model';

/**
 * Cart page (/cart) — local-first cart view.
 *
 * Phase 2 surface. Renders the user's cart from CartService:
 *   - Empty state when CartService.isEmpty() === true
 *   - Otherwise: list of items + summary panel + checkout CTA
 *
 * Render mode:
 *   - This route is configured as RenderMode.Client in
 *     app.routes.server.ts because the cart's content is per-user
 *     localStorage state. SSR has nothing meaningful to prerender.
 *   - Result: the page shell (header + footer) is part of the static
 *     app shell, served by Cloudflare ASSETS. The cart content
 *     hydrates on the browser as soon as JS loads.
 *
 * SEO:
 *   - Cart page is noindex'd via SeoService — it's a per-user surface
 *     with no marketable content for search engines.
 *
 * Stepper UX:
 *   - Quantity stepper has a min of 1 to prevent accidental qty=0
 *     deletions; users explicitly remove a line via the "Remove" button.
 *   - update() in CartService still routes qty<=0 → remove() as a
 *     safety net, but the UI never sends a value below 1.
 *
 * Phase 3 will replace the stub "Proceed to checkout" with the real
 * /checkout route; for now the button navigates to a placeholder that
 * doesn't yet exist (and the user gets a friendly 404 thanks to W2.2c).
 */
@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.scss',
})
export class CartPageComponent {
  private cart = inject(CartService);
  private seo = inject(SeoService);

  /* Expose service signals to the template. Templates bind to these
     reactive sources directly — Angular's signal-aware change detection
     re-renders only when the underlying signal changes. */
  items = this.cart.items;
  isEmpty = this.cart.isEmpty;
  count = this.cart.count;
  subtotal = this.cart.subtotal;

  constructor() {
    /* Cart is per-user — robots:noindex tells crawlers not to index it.
       No canonical url specified (the SeoService default URL still
       fires, but search engines see the noindex directive and stop). */
    this.seo.set({
      title: 'Your Cart',
      description: 'Review the items in your cart before checkout.',
      robots: 'noindex,nofollow',
    });
  }

  /** Format Money (AED 530 → "AED 530"). Mirrors the PDP helper to
   *  keep the rendering consistent across surfaces. */
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

  /** Compute a single line's subtotal for the right-side label. */
  lineSubtotal(item: CartItem): Money {
    return {
      amount: item.unit_price.amount * item.qty,
      currency: item.unit_price.currency,
    };
  }

  /** Increment quantity by 1. Hard upper limit at 99 — practical
   *  catch in case a user holds Enter on the increment button; real
   *  inventory enforcement happens at checkout. */
  incrementQty(item: CartItem): void {
    if (item.qty >= 99) return;
    this.cart.update(item.key, item.qty + 1);
  }

  /** Decrement quantity by 1, with a floor of 1. Removing a line is
   *  the explicit "Remove" button's job; the - button shouldn't make
   *  items quietly vanish. */
  decrementQty(item: CartItem): void {
    if (item.qty <= 1) return;
    this.cart.update(item.key, item.qty - 1);
  }

  /** Remove a line item from the cart. */
  removeItem(item: CartItem): void {
    this.cart.remove(item.key);
  }

  /** Build the /designer/:slug URL for a cart line, if a vendor slug
   *  was captured at add-time. Falls back to null (template hides the
   *  link when null). */
  vendorUrl(item: CartItem): string | null {
    return item.vendor_slug ? `/designer/${item.vendor_slug}` : null;
  }

  /** Build the /product/:slug URL for the cart line link to the PDP. */
  productUrl(item: CartItem): string {
    return `/product/${item.slug}`;
  }
}
