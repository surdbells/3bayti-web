/**
 * Category — matches the GET /v2/categories response item shape.
 *
 * The icon URL is currently broken on the backend side (the
 * category.icon column contains Lucide icon names like '@tui.sparkles',
 * not image paths). The endpoint wraps them as if they were product
 * images, producing URLs that 404. Until backend fixes this, we
 * gracefully render a letter fallback. See the OpenAPI spec for the
 * canonical shape.
 */
export interface Category {
  id: number;
  slug: string;            // e.g. "abayas-1"  (slugified-name-{id})
  name: string;
  description: string | null;
  image: { url: string } | null;
  product_count: number;
}
