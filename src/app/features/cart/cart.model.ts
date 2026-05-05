import type { Money } from '../catalog/product.model';

/**
 * A single item in the cart.
 *
 * Design notes:
 *   - Cart items are denormalised — they snapshot product details at the
 *     moment of adding so the cart still renders correctly if the
 *     product is later removed/renamed/repriced. The user sees what
 *     they expect to see; the backend will re-validate prices at
 *     checkout.
 *   - `key` is the cart's unique identifier per item, distinct from
 *     product_id because the same product can appear twice with
 *     different variant_ids (size/color combos). For Phase 2 we
 *     treat product_id alone as the key — variant support arrives
 *     when the backend exposes it.
 *   - `unit_price` snapshots the price at add-time. Sale-price rules
 *     are applied here (if there's a sale_price < price, that's what
 *     we store). The display always shows unit_price * qty.
 *   - `added_at` is a millisecond timestamp; used to sort the cart
 *     "most recently added first" (mobile-app convention) and as
 *     a debug aid.
 */
export interface CartItem {
  /** Unique key for this cart line. For now: 'p:<product_id>'. Variants
   *  later: 'p:<product_id>:v:<variant_id>'. */
  key: string;
  /** Backend product id — used by the future merge-on-login sync. */
  product_id: number;
  /** Slug for routing back to the PDP. */
  slug: string;
  /** Product name (snapshot). */
  name: string;
  /** Vendor display name (snapshot). */
  vendor_name: string;
  /** Vendor slug for routing to /designer/:slug from cart line. */
  vendor_slug?: string;
  /** Thumbnail URL (snapshot). May be null if the product had no image. */
  image_url: string | null;
  /** Unit price at add-time (sale price applied if applicable). */
  unit_price: Money;
  /** Quantity in cart. Must be >= 1. */
  qty: number;
  /** ms timestamp when added — used for sort order and debug. */
  added_at: number;
}

/**
 * Persisted cart shape — what we serialise into localStorage.
 * Versioned so future schema changes can be migrated rather than crash
 * old clients that still have v1 data.
 */
export interface CartStateV1 {
  version: 1;
  items: CartItem[];
  /** ms timestamp of the last mutation. Used for the future merge-on-login
   *  conflict resolution (last-writer-wins by default). */
  last_updated: number;
}

/** localStorage key. Versioned so a v2 schema bump uses a different key
 *  and the v1 data remains for a one-time migration step. */
export const CART_STORAGE_KEY = '3bayti.cart.v1';
