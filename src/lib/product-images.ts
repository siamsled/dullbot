export type ProductImageRow = {
  id?: string;
  product_id?: string;
  variant_id?: string | null;
  url: string;
  position?: number;
};

/**
 * Returns the primary image URL for a product or specific variant.
 * If a variantId is passed and a matching image exists for that variant, it is returned.
 * Otherwise, it falls back to the product-level image with the lowest position.
 */
export function getPrimaryImageUrl(
  images?: ProductImageRow[] | null,
  variantId?: string | null
): string | null {
  if (!images || images.length === 0) return null;

  // 1. If variantId is provided, look for a variant-specific image
  if (variantId) {
    const variantImg = images.find(img => img.variant_id === variantId);
    if (variantImg?.url) return variantImg.url;
  }

  // 2. Fall back to generic product-level image (variant_id is null) or first available
  const productImg = images
    .filter(img => !img.variant_id)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];

  if (productImg?.url) return productImg.url;

  // 3. Fallback to any first image
  return images[0]?.url ?? null;
}

/**
 * Extracts generic product-level image URLs (where variant_id is null) in position order.
 */
export function getGenericImageUrls(images?: ProductImageRow[] | null): string[] {
  if (!images || images.length === 0) return [];
  return images
    .filter(img => !img.variant_id)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(img => img.url);
}
