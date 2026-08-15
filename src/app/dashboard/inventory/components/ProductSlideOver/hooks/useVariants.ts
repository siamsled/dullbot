import { useState, useEffect, useCallback } from 'react';
import { Variant, Product } from '../productForm.types';

export type VariantWithState = Variant & {
  _isNew?: boolean;
  _deleted?: boolean;
  image_urls?: string[];
  displayUrls?: string[];
};

export function generateSkuForVariant(
  variantName: string,
  parentSku?: string | null,
  parentName?: string | null,
  index?: number
): string {
  let base = parentSku?.trim().toUpperCase();
  if (!base && parentName?.trim()) {
    // Generate base from product name (e.g. "Everyday Canvas Tote" -> "ECT" or sanitized first 2 words)
    const words = parentName.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      base = words.slice(0, 3).map(w => (w.length > 3 ? w.slice(0, 3) : w)).join('-');
    } else if (words.length === 1) {
      base = words[0].slice(0, 6);
    }
  }
  if (!base) base = 'PROD';

  // Clean variant name: remove "Color:", "Size:", etc.
  const cleaned = variantName
    .replace(/^(color|size|material|style|option|variant):\s*/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();

  return cleaned ? `${base}-${cleaned}` : `${base}-${index ?? 1}`;
}

export function useVariants(product?: Product, initialVariants: Variant[] = []) {
  const parseInitialVariants = useCallback((vars: Variant[]) => {
    return (vars ?? []).map(v => {
      const variantImages = (product as any)?.product_images
        ?.filter((i: any) => i.variant_id === v.id)
        ?.sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
        ?.map((i: any) => i.url) ?? [];

      const initialUrls = variantImages.length > 0 ? variantImages : (v.image_url ? [v.image_url] : []);
      return {
        ...v,
        image_url: initialUrls[0] ?? null,
        image_urls: initialUrls,
        displayUrls: initialUrls,
      };
    });
  }, [product]);

  const [variants, setVariants] = useState<VariantWithState[]>(() => parseInitialVariants(initialVariants));
  const [showVariantBuilder, setShowVariantBuilder] = useState(initialVariants.length > 0);
  const [variantOptionName, setVariantOptionName] = useState('');
  const [variantOptionValues, setVariantOptionValues] = useState('');

  useEffect(() => {
    setVariants(parseInitialVariants(initialVariants));
    setShowVariantBuilder(initialVariants.length > 0);
  }, [product, initialVariants, parseInitialVariants]);

  const generateVariants = () => {
    if (!variantOptionName.trim() || !variantOptionValues.trim()) return;
    const values = variantOptionValues.split(',').map(v => v.trim()).filter(Boolean);
    const seen = new Set<string>(variants.filter(v => !v._deleted && v.sku).map(v => v.sku!));

    const newVariants: VariantWithState[] = values.map((v, idx) => {
      const vName = `${variantOptionName}: ${v}`;
      let newSku = generateSkuForVariant(vName, product?.sku, product?.name, idx + 1);
      let uniqueSku = newSku;
      let counter = 1;
      while (seen.has(uniqueSku)) {
        uniqueSku = `${newSku}-${counter}`;
        counter++;
      }
      seen.add(uniqueSku);

      return {
        id: `new-${Date.now()}-${Math.random()}`,
        product_id: product?.id ?? '',
        name: vName,
        sku: uniqueSku,
        price_override: null,
        stock: 0,
        image_url: null,
        image_urls: [],
        displayUrls: [],
        _isNew: true,
      };
    });

    setVariants(prev => [...prev, ...newVariants]);
    setVariantOptionName('');
    setVariantOptionValues('');
  };

  const addVariant = () => {
    const existingCount = variants.filter(v => !v._deleted).length;
    const vName = `Variant ${existingCount + 1}`;
    const vSku = generateSkuForVariant(vName, product?.sku, product?.name, existingCount + 1);

    const newVariant: VariantWithState = {
      id: `new-${Date.now()}-${Math.random()}`,
      product_id: product?.id ?? '',
      name: vName,
      sku: vSku,
      price_override: null,
      stock: 0,
      image_url: null,
      image_urls: [],
      displayUrls: [],
      _isNew: true,
    };
    setVariants(prev => [...prev, newVariant]);
  };

  const autoGenerateSkus = (parentSku?: string | null, parentName?: string | null) => {
    const seen = new Set<string>();
    setVariants(prev =>
      prev.map((v, idx) => {
        if (v._deleted) return v;
        const newSku = generateSkuForVariant(v.name, parentSku ?? product?.sku, parentName ?? product?.name, idx + 1);
        let uniqueSku = newSku;
        let counter = 1;
        while (seen.has(uniqueSku)) {
          uniqueSku = `${newSku}-${counter}`;
          counter++;
        }
        seen.add(uniqueSku);
        return { ...v, sku: uniqueSku };
      })
    );
  };

  const hasUnsavedChanges = (() => {
    const activeVariantsList = variants.filter(v => !v._deleted);

    if (activeVariantsList.length !== initialVariants.length) return true;

    return activeVariantsList.some(v => {
      if (v._isNew || v.id.startsWith('new-')) return true;
      const orig = initialVariants.find(iv => iv.id === v.id);
      if (!orig) return true;

      const origImages = (product as any)?.product_images
        ?.filter((i: any) => i.variant_id === v.id)
        ?.map((i: any) => i.url) ?? (orig.image_url ? [orig.image_url] : []);

      const currentImages = v.image_urls ?? (v.image_url ? [v.image_url] : []);
      const imagesChanged = JSON.stringify([...origImages].sort()) !== JSON.stringify([...currentImages].sort());

      return (
        v.name !== orig.name ||
        v.sku !== (orig.sku ?? '') ||
        v.price_override !== orig.price_override ||
        imagesChanged
      );
    });
  })();

  const getPayload = () => {
    return variants.map(v => ({
      ...v,
      image_url: v.image_url && !v.image_url.startsWith('blob:') ? v.image_url : null,
      image_urls: (v.image_urls ?? []).filter(u => u && !u.startsWith('blob:')),
    }));
  };

  return {
    state: {
      variants,
      showVariantBuilder,
      variantOptionName,
      variantOptionValues,
      hasUnsavedChanges,
    },
    setters: {
      setVariants,
      setShowVariantBuilder,
      setVariantOptionName,
      setVariantOptionValues,
    },
    generateVariants,
    addVariant,
    autoGenerateSkus,
    getPayload,
  };
}
