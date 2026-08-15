import { useState, useEffect } from 'react';
import { Product } from '../productForm.types';

export function useProductForm(product?: Product) {
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [categoryInput, setCategoryInput] = useState(product?.category ?? '');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [tags, setTags] = useState<string[]>(product?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  
  const [price, setPrice] = useState(product?.price?.toString() ?? '');
  const [compareAtPrice, setCompareAtPrice] = useState(product?.compare_at_price?.toString() ?? '');
  const [costPrice, setCostPrice] = useState(product?.cost_price?.toString() ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [defaultSupplierId, setDefaultSupplierId] = useState(product?.default_supplier_id ?? '');
  
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasUnsavedChanges = product ? (
    name !== (product.name ?? '') ||
    description !== (product.description ?? '') ||
    category !== (product.category ?? '') ||
    tags.join(',') !== (product.tags ?? []).join(',') ||
    price !== (product.price?.toString() ?? '') ||
    compareAtPrice !== (product.compare_at_price?.toString() ?? '') ||
    costPrice !== (product.cost_price?.toString() ?? '') ||
    sku !== (product.sku ?? '') ||
    defaultSupplierId !== (product.default_supplier_id ?? '') ||
    isActive !== (product.is_active ?? true)
  ) : (
    name !== '' || price !== '' || sku !== '' || category !== '' || tags.length > 0 || description !== ''
  );

  useEffect(() => {
    if (product) {
      setName(product.name ?? '');
      setDescription(product.description ?? '');
      setCategory(product.category ?? '');
      setCategoryInput(product.category ?? '');
      setTags(product.tags ?? []);
      setPrice(product.price?.toString() ?? '');
      setCompareAtPrice(product.compare_at_price?.toString() ?? '');
      setCostPrice(product.cost_price?.toString() ?? '');
      setSku(product.sku ?? '');
      setDefaultSupplierId(product.default_supplier_id ?? '');
      setIsActive(product.is_active ?? true);
    }
  }, [product]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Product name is required';
    const p = parseFloat(price);
    if (!price || isNaN(p) || p <= 0) e.price = 'A valid price is required';
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const getPayload = () => {
    return {
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      price: parseFloat(price),
      compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
      cost_price: costPrice ? parseFloat(costPrice) : null,
      sku: sku.trim() || null,
      is_active: isActive,
    };
  };

  return {
    state: {
      name, description, category, categoryInput, showCategoryDropdown,
      tags, tagInput, price, compareAtPrice, costPrice, sku, defaultSupplierId, isActive, errors,
      hasUnsavedChanges
    },
    setters: {
      setName, setDescription, setCategory, setCategoryInput, setShowCategoryDropdown,
      setTags, setTagInput, setPrice, setCompareAtPrice, setCostPrice, setSku, setDefaultSupplierId, setIsActive, setErrors
    },
    validate,
    getPayload
  };
}
