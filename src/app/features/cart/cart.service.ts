import { Injectable, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import type { Product } from '../catalog/product.model';
import type { CartItem, CartStateV1 } from './cart.model';
import { CART_STORAGE_KEY } from './cart.model';

/**
 * CartService — the single source of truth for the user's cart.
 *
 * Architecture:
 *   - Signal-driven (`items` is the writable signal; `count` and
 *     `subtotal` are computed). Components consume these signals
 *     directly in OnPush templates.
 *   - localStorage-backed on the browser. Each mutation writes to
 *     storage synchronously. Storage reads happen once on init.
 *   - SSR-safe: on the server, the service starts with empty state
 *     and never touches storage. Components rendered server-side will
 *     show an empty cart; the browser hydrates with the real cart
 *     after JS loads.
 *
 * Why localStorage and not cookies / sessionStorage / IndexedDB:
 *   - Cookies: would inflate every API request payload by the cart
 *     size, and we don't need the cart server-side until checkout
 *   - sessionStorage: would lose the cart when the user closes the
 *     tab — bad UX
 *   - IndexedDB: overkill for a flat array of <50 items
 *
 * Storage failure handling:
 *   - localStorage can throw (private browsing on Safari, quota
 *     exceeded). The service catches all storage errors and continues
 *     with in-memory state. The user's session works; their cart just
 *     won't survive a refresh.
 *   - A future Phase 9 hardening pass might surface a banner when
 *     storage is unavailable, but for v1 silent degradation is fine.
 *
 * Phase 3 will add:
 *   - mergeWithServerCart() — called after login, merges local state
 *     with whatever the user's account already had on the server
 *   - sync() — pushes changes to the server when authenticated
 *
 * Both will be additive; the local-first surface stays unchanged.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private platformId = inject(PLATFORM_ID);

  /** The cart items, sorted most-recently-added first.
   *
   *  This is the authoritative writable signal. All mutation methods
   *  call this.items.set(newItems) and write to storage. Computed
   *  signals (count, subtotal) derive from this one source.
   */
  readonly items = signal<CartItem[]>([]);

  /** Total number of items in the cart (sum of all line qtys). Used
   *  for the header cart badge. */
  readonly count = computed(() =>
    this.items().reduce((sum, i) => sum + i.qty, 0)
  );

  /** Total cart subtotal in the cart's common currency. We assume all
   *  items are priced in the same currency (AED for the UAE market);
   *  if mixed currencies ever appear, this naively sums the amounts
   *  which would be wrong — but the backend currently returns AED for
   *  every product so this assumption holds. */
  readonly subtotal = computed(() => {
    const items = this.items();
    if (items.length === 0) {
      return { amount: 0, currency: 'AED' };
    }
    const currency = items[0].unit_price.currency;
    const amount = items.reduce(
      (sum, i) => sum + i.unit_price.amount * i.qty,
      0
    );
    return { amount, currency };
  });

  /** True iff the cart has at least one item. Convenience for
   *  empty-state branches in templates. */
  readonly isEmpty = computed(() => this.items().length === 0);

  constructor() {
    /* Hydrate from localStorage on browser. SSR/server runs leave the
       initial empty signal value as-is. */
    if (isPlatformBrowser(this.platformId)) {
      this.hydrateFromStorage();
    }
  }

  /* ----- Mutation API ----------------------------------------------- */

  /**
   * Add a product to the cart.
   *
   * @param product The product being added (must have id, slug, name,
   *                vendor, primary_image, price, in_stock).
   * @param qty     Quantity to add. Must be >= 1. Defaults to 1.
   *
   * Behavior:
   *   - If the product is already in the cart, increment qty.
   *   - Otherwise create a new line item, sale-price-aware.
   *   - Updates last_updated timestamp.
   *   - New items go to the top (most-recently-added first).
   */
  add(product: Product, qty: number = 1): void {
    if (qty < 1) return;
    const key = this.makeKey(product.id);
    const existing = this.items().find(i => i.key === key);

    if (existing) {
      this.update(key, existing.qty + qty);
      return;
    }

    /* Pick sale price if it's strictly lower than the regular price.
       Same rule as ProductCard's isOnSale() helper. */
    const unitPrice =
      product.sale_price && product.sale_price.amount < product.price.amount
        ? product.sale_price
        : product.price;

    const newItem: CartItem = {
      key,
      product_id: product.id,
      slug: product.slug,
      name: product.name,
      vendor_name: product.vendor?.name ?? 'Unknown vendor',
      vendor_slug: product.vendor?.slug,
      image_url: product.primary_image?.url ?? null,
      unit_price: unitPrice,
      qty,
      added_at: Date.now(),
    };

    /* Prepend so most-recently-added shows first. */
    this.items.set([newItem, ...this.items()]);
    this.persist();
  }

  /**
   * Update an item's quantity. Setting qty to 0 removes the item.
   */
  update(key: string, qty: number): void {
    if (qty <= 0) {
      this.remove(key);
      return;
    }
    const next = this.items().map(i =>
      i.key === key ? { ...i, qty } : i
    );
    this.items.set(next);
    this.persist();
  }

  /** Remove an item from the cart entirely. */
  remove(key: string): void {
    const next = this.items().filter(i => i.key !== key);
    this.items.set(next);
    this.persist();
  }

  /** Empty the cart. Used by post-checkout flows in Phase 3. */
  clear(): void {
    this.items.set([]);
    this.persist();
  }

  /* ----- Storage ---------------------------------------------------- */

  /** Build the cart line key for a given product id. Variant support
   *  later will extend this to include variant_id. */
  private makeKey(productId: number): string {
    return `p:${productId}`;
  }

  /** Read the cart from localStorage. Falls back to empty state on
   *  any error (parse failure, unknown version, storage unavailable). */
  private hydrateFromStorage(): void {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CartStateV1;
      if (parsed.version !== 1 || !Array.isArray(parsed.items)) {
        /* Unknown version or corrupt data — bail rather than crash.
           Logging here would help debugging but not necessary in v1. */
        return;
      }
      this.items.set(parsed.items);
    } catch {
      /* Storage unavailable (private mode, quota, JSON parse failure).
         Leave the signal at its default empty value. */
    }
  }

  /** Write the current cart to localStorage. Best-effort; storage
   *  errors are swallowed (the in-memory state is still correct). */
  private persist(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const state: CartStateV1 = {
        version: 1,
        items: this.items(),
        last_updated: Date.now(),
      };
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Quota exceeded or storage unavailable. The cart still works
         in this session — it just won't survive a refresh. */
    }
  }
}
