export type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  compare_at_price?: number | null;
  cost_price?: number | null;
  currency: string;
  stock_quantity: number;
  sku?: string | null;
  category?: string | null;
  tags?: string[] | null;
  images?: string[] | null;
  low_stock_threshold?: number | null;
  default_supplier_id?: string | null;
  is_active: boolean;
  draft: boolean;
  source?: string;
  updated_at?: string | null;
};

export type Variant = {
  id: string;
  product_id: string;
  name: string;
  sku?: string | null;
  price_override?: number | null;
  stock: number;
  image_url?: string | null;
  displayUrl?: string | null;
};

export type StockMovement = {
  id: string;
  change_type: string;
  quantity_delta: number;
  resulting_stock: number;
  note?: string | null;
  created_at: string;
  suppliers?: { name?: string } | null;
  cost_per_unit?: number | null;
};

export type ContextMediaItem = {
  id?: string;
  url: string;
  displayUrl?: string;
  media_type: 'image' | 'video';
  tags: string[];
  _isNew?: boolean;
};

export interface Props {
  isNew: boolean;
  product?: Product;
  variants?: Variant[];
  suppliers: { id: string; name: string }[];
  existingCategories: string[];
  shopId: string;
  onClose: () => void;
  onSaved: (product: Product, isNew: boolean, savedVariants?: Variant[]) => void;
  /** Called after a quick stock adjust/restock — updates parent state WITHOUT closing the panel */
  onStockUpdated?: (product: Product) => void;
  onMovementAdded?: () => void;
}
