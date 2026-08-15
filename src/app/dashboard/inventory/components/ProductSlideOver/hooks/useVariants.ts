import { useState, useEffect } from 'react';
import { Variant, Product } from '../productForm.types';

export type VariantWithState = Variant & { _isNew?: boolean; _deleted?: boolean };

export function useVariants(product?: Product, initialVariants: Variant[] = []) {
  const [variants, setVariants] = useState<VariantWithState[]>(() => {
    return (initialVariants ?? []).map(v => {
      const variantImg = (product as any)?.product_images?.find((i: any) => i.variant_id === v.id);
      return {
        ...v,
        image_url: variantImg?.url ?? v.image_url ?? null,
      };
    });
  });

  const [showVariantBuilder, setShowVariantBuilder] = useState(initialVariants.length > 0);
  const [variantOptionName, setVariantOptionName] = useState('');
  const [variantOptionValues, setVariantOptionValues] = useState('');

  useEffect(() => {
    setVariants((initialVariants ?? []).map(v => {
      const variantImg = (product as any)?.product_images?.find((i: any) => i.variant_id === v.id);
      return {
        ...v,
        image_url: variantImg?.url ?? v.image_url ?? null,
      };
    }));
    setShowVariantBuilder(initialVariants.length > 0);
  }, [product, initialVariants]);

  const generateVariants = () => {
    if (!variantOptionName.trim() || !variantOptionValues.trim()) return;
    const values = variantOptionValues.split(',').map(v => v.trim()).filter(Boolean);
    const newVariants: VariantWithState[] = values.map(v => ({
      id: `new-${Date.now()}-${Math.random()}`,
      product_id: product?.id ?? '',
      name: `${variantOptionName}: ${v}`,
      sku: '',
      price_override: null,
      stock: 0,
      _isNew: true,
    }));
    setVariants(prev => [...prev, ...newVariants]);
    setVariantOptionName('');
    setVariantOptionValues('');
  };

  const addVariant = () => {
    const newVariant: VariantWithState = {
      id: `new-${Date.now()}-${Math.random()}`,
      product_id: product?.id ?? '',
      name: `New Variant`,
      sku: '',
      price_override: null,
      stock: 0,
      _isNew: true,
    };
    setVariants(prev => [...prev, newVariant]);
  };

  const hasUnsavedChanges = (() => {
    const activeVariantsList = variants.filter(v => !v._deleted);
    
    // If counts differ (deleted or added new)
    if (activeVariantsList.length !== initialVariants.length) return true;
    
    // If any existing variant was modified (we don't track stock changes here for inventory, 
    // but we do track metadata changes like name, sku, price, image)
    return activeVariantsList.some(v => {
      if (v._isNew || v.id.startsWith('new-')) return true;
      const orig = initialVariants.find(iv => iv.id === v.id);
      if (!orig) return true;
      
      const variantImg = (product as any)?.product_images?.find((i: any) => i.variant_id === v.id);
      const origImage = variantImg?.url ?? orig.image_url ?? null;
      
      return (
        v.name !== orig.name ||
        v.sku !== (orig.sku ?? '') ||
        v.price_override !== orig.price_override ||
        v.image_url !== origImage
      );
    });
  })();

  const getPayload = () => {
    return variants.map(v => ({
      ...v,
      image_url: v.image_url && !v.image_url.startsWith('blob:') ? v.image_url : null,
    }));
  };

  return {
    state: {
      variants,
      showVariantBuilder,
      variantOptionName,
      variantOptionValues,
      hasUnsavedChanges
    },
    setters: {
      setVariants,
      setShowVariantBuilder,
      setVariantOptionName,
      setVariantOptionValues
    },
    generateVariants,
    addVariant,
    getPayload
  };
}
