'use client';

import { useState, useTransition } from 'react';
import { Product, Variant, Props } from './productForm.types';
import { useProductForm } from './hooks/useProductForm';
import { useVariants } from './hooks/useVariants';
import { useProductMedia } from './hooks/useProductMedia';
import { useInventory } from './hooks/useInventory';

import ProductHeader from './ProductHeader';
import ProductOverview from './ProductOverview';
import ProductMedia from './ProductMedia';
import ProductVariants from './ProductVariants';
import ProductInventory from './ProductInventory';
import ProductActivity from './ProductActivity';
import ProductFooter from './ProductFooter';

import { addProduct, updateProduct, addVariants, updateVariant, deleteVariant, saveProductMedia, getProductVariants } from '../../actions';

type Tab = 'Overview' | 'Media' | 'Variants' | 'Inventory' | 'Activity';

export default function ProductSlideOver({
  isNew, product, variants: initialVariants = [], suppliers, existingCategories, shopId,
  onClose, onSaved, onStockUpdated, onMovementAdded
}: Props) {
  
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [isPending, startTransition] = useTransition();

  // Preview Media state
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video'; title?: string } | null>(null);

  // Discard Modal
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  // Initialize Hooks
  const formHook = useProductForm(product);
  const mediaHook = useProductMedia(product, shopId);
  const variantsHook = useVariants(product, initialVariants);
  const inventoryHook = useInventory(product, variantsHook.state.variants.filter(v => !v._deleted));

  const hasUnsavedChanges = formHook.state.hasUnsavedChanges || mediaHook.state.hasUnsavedChanges || variantsHook.state.hasUnsavedChanges;

  const handleCloseRequest = () => {
    if (hasUnsavedChanges) setShowDiscardModal(true);
    else onClose();
  };

  const handleSave = () => {
    if (!formHook.validate()) {
      setActiveTab('Overview');
      return;
    }

    startTransition(async () => {
      const activeVariantsList = variantsHook.state.variants.filter(v => !v._deleted);
      const hasVariants = activeVariantsList.length > 0;
      
      const payload = formHook.getPayload();
      const mediaPayload = mediaHook.getPayload();
      
      const productImagesData = mediaPayload.images.map((url, idx) => ({ url, variant_id: null, position: idx }));

      const input: any = {
        ...payload,
        // Since inventory is transactional now, saving the product does NOT touch the stock fields unless it's a completely new product.
        // For new products without variants, initial stock is 0 (set later via inventory adjust).
        stock_quantity: hasVariants ? activeVariantsList.reduce((s, v) => s + (v.stock || 0), 0) : (product?.stock_quantity ?? 0),
        images: mediaPayload.images,
        product_images_data: productImagesData,
        low_stock_threshold: product?.low_stock_threshold ?? 5,
        default_supplier_id: product?.default_supplier_id ?? null,
        draft: product?.draft ?? false,
      };

      if (isNew) {
        const res = await addProduct({ ...input, skipProductStockMovement: true });
        if (res?.error) {
          formHook.setters.setErrors({ _form: res.error });
          return;
        }

        let realVariantIds: Record<string, string> = {};

        if (activeVariantsList.length && res?.productId) {
          const variantInputs = activeVariantsList.map(v => ({
            name: v.name, sku: v.sku, price_override: v.price_override, stock: v.stock || 0
          }));
          const varRes = await addVariants(res.productId, variantInputs);
          if (varRes?.variants) {
            activeVariantsList.forEach((v, idx) => {
              realVariantIds[v.id] = varRes.variants![idx].id;
            });
          }
        }

        if (res?.productId) {
          // Construct productImagesData now that we have real variant IDs
          const allImagesData: { url: string; variant_id: string | null; position: number }[] = mediaPayload.images.map((url, idx) => ({ url, variant_id: null, position: idx }));
          
          let imgPos = mediaPayload.images.length;
          activeVariantsList.forEach(v => {
            const vUrls = v.image_urls && v.image_urls.length > 0 ? v.image_urls : (v.image_url ? [v.image_url] : []);
            const targetId = realVariantIds[v.id] ?? null;
            vUrls.forEach(url => {
              if (url && !url.startsWith('blob:')) {
                allImagesData.push({
                  url,
                  variant_id: targetId,
                  position: imgPos++
                });
              }
            });
          });

          await updateProduct(res.productId, { product_images_data: allImagesData, skipProductStockMovement: true });
          await saveProductMedia(res.productId, mediaPayload.contextMedia);
        }

        const savedVariantsList = res?.productId ? await getProductVariants(res.productId) : [];
        onSaved({ id: res?.productId ?? '', ...input, currency: 'BDT', draft: false, is_active: input.is_active ?? true }, true, savedVariantsList);
      } else {
        const realVariantIds: Record<string, string> = {};

        for (const v of variantsHook.state.variants) {
          if ((v._isNew || v.id.startsWith('new-')) && !v._deleted) {
            const varRes = await addVariants(product!.id, [{
              name: v.name, sku: v.sku, price_override: v.price_override, stock: v.stock || 0
            }]);
            if (varRes?.variants?.[0]) {
              realVariantIds[v.id] = varRes.variants[0].id;
            }
          } else if (!v._isNew && !v.id.startsWith('new-') && !v._deleted) {
            realVariantIds[v.id] = v.id;
            await updateVariant(v.id, {
              name: v.name, sku: v.sku, price_override: v.price_override
            });
          } else if (v._deleted && !v._isNew && !v.id.startsWith('new-')) {
            await deleteVariant(v.id);
          }
        }

        // Construct productImagesData
        const allImagesData: { url: string; variant_id: string | null; position: number }[] = mediaPayload.images.map((url, idx) => ({ url, variant_id: null, position: idx }));
        
        let imgPos = mediaPayload.images.length;
        activeVariantsList.forEach(v => {
          const vUrls = v.image_urls && v.image_urls.length > 0 ? v.image_urls : (v.image_url ? [v.image_url] : []);
          const targetId = realVariantIds[v.id] ?? v.id;
          vUrls.forEach(url => {
            if (url && !url.startsWith('blob:')) {
              allImagesData.push({
                url,
                variant_id: targetId,
                position: imgPos++
              });
            }
          });
        });

        await updateProduct(product!.id, { ...input, product_images_data: allImagesData, skipProductStockMovement: true });
        await saveProductMedia(product!.id, mediaPayload.contextMedia);

        const savedVariantsList = await getProductVariants(product!.id);
        onSaved({ ...product!, ...input }, false, savedVariantsList);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop & Left Canvas Preview Area */}
      <div
        className="flex-1 bg-black/50 backdrop-blur-sm relative flex flex-col items-center justify-center p-6 transition-all duration-200"
        onClick={() => {
          if (previewMedia) setPreviewMedia(null);
          else handleCloseRequest();
        }}
      >
        {previewMedia ? (
          <div
            className="relative max-w-full max-h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative bg-ink/90 border border-white/15 rounded-cards shadow-2xl overflow-hidden p-3 flex flex-col items-center max-w-[90%] max-h-[85vh]">
              <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-white">
                <span className="text-xs font-medium truncate">{previewMedia.title || 'Media Preview'}</span>
                <button type="button" onClick={() => setPreviewMedia(null)} className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center">
                  &times;
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                {previewMedia.type === 'video' ? (
                  <video src={previewMedia.url} controls autoPlay playsInline className="max-h-[75vh] max-w-full rounded object-contain" />
                ) : (
                  <img src={previewMedia.url} alt="Preview" className="max-h-[75vh] max-w-full rounded object-contain" />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-white/40 text-xs select-none pointer-events-none hidden md:block">
            Click outside to close
          </div>
        )}
      </div>

      {/* Slide Over Panel */}
      <div className="w-full max-w-3xl bg-white shadow-2xl overflow-hidden flex flex-col relative" onClick={e => e.stopPropagation()}>
        
        {showDiscardModal && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white border border-dove/20 shadow-xl rounded-xl p-6 max-w-sm w-full">
              <h3 className="text-base font-bold text-ink mb-2">Discard changes?</h3>
              <p className="text-sm text-ash mb-6">Your changes haven't been saved. If you leave now, you'll lose any edits made.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowDiscardModal(false)} className="px-4 py-2 text-sm font-medium text-graphite hover:bg-fog rounded-lg">
                  Keep editing
                </button>
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-rust text-white hover:bg-rust/90 rounded-lg">
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

        <ProductHeader
          product={product}
          isNew={isNew}
          name={formHook.state.name}
          sku={formHook.state.sku}
          images={mediaHook.state.images}
          isActive={formHook.state.isActive}
          hasUnsavedChanges={hasUnsavedChanges}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onClose={handleCloseRequest}
          mediaCount={mediaHook.state.images.length + mediaHook.state.contextMedia.length}
          variantsCount={variantsHook.state.variants.filter(v => !v._deleted).length}
          totalStock={variantsHook.state.variants.filter(v => !v._deleted).length > 0 ? variantsHook.state.variants.filter(v => !v._deleted).reduce((s, v) => s + (v.stock || 0), 0) : (product?.stock_quantity ?? 0)}
          activityCount={inventoryHook.state.movements.length}
        />

        <div className="flex-1 overflow-y-auto bg-white">
          <div className="pb-12">
            {activeTab === 'Overview' && (
              <ProductOverview 
                {...formHook.state}
                {...formHook.setters}
                existingCategories={existingCategories}
                suppliers={suppliers}
                defaultSupplierId={formHook.state.defaultSupplierId || ''}
                setDefaultSupplierId={v => formHook.setters.setErrors({})}
              />
            )}
            
            {activeTab === 'Media' && (
              <ProductMedia
                {...mediaHook.state}
                {...mediaHook.setters}
                uploadFiles={mediaHook.uploadFiles}
                setPreviewMedia={setPreviewMedia}
              />
            )}
            
            {activeTab === 'Variants' && (
              <ProductVariants
                {...variantsHook.state}
                {...variantsHook.setters}
                generateVariants={variantsHook.generateVariants}
                addVariant={variantsHook.addVariant}
                autoGenerateSkus={variantsHook.autoGenerateSkus}
                images={mediaHook.state.images}
                shopId={shopId}
                parentSku={formHook.state.sku}
                parentName={formHook.state.name}
                setPreviewMedia={setPreviewMedia}
                setScanningTarget={() => {}}
                setActiveTab={setActiveTab}
              />
            )}
            
            {activeTab === 'Inventory' && (
              <ProductInventory
                isNew={isNew}
                product={product}
                variants={variantsHook.state.variants}
                isPending={inventoryHook.state.isPending}
                adjustDelta={inventoryHook.state.adjustDelta}
                setAdjustDelta={inventoryHook.setters.setAdjustDelta}
                adjustNote={inventoryHook.state.adjustNote}
                setAdjustNote={inventoryHook.setters.setAdjustNote}
                adjustError={inventoryHook.state.adjustError}
                adjustVariantId={inventoryHook.state.adjustVariantId}
                setAdjustVariantId={inventoryHook.setters.setAdjustVariantId}
                handleAdjust={(ns) => { inventoryHook.handleAdjust(ns); onMovementAdded?.(); }}
                
                showRestockForm={inventoryHook.state.showRestockForm}
                setShowRestockForm={inventoryHook.setters.setShowRestockForm}
                restockQty={inventoryHook.state.restockQty}
                setRestockQty={inventoryHook.setters.setRestockQty}
                restockSupplierId={inventoryHook.state.restockSupplierId}
                setRestockSupplierId={inventoryHook.setters.setRestockSupplierId}
                restockCost={inventoryHook.state.restockCost}
                setRestockCost={inventoryHook.setters.setRestockCost}
                restockNote={inventoryHook.state.restockNote}
                setRestockNote={inventoryHook.setters.setRestockNote}
                restockVariantId={inventoryHook.state.restockVariantId}
                setRestockVariantId={inventoryHook.setters.setRestockVariantId}
                handleRestock={(ns) => { inventoryHook.handleRestock(ns); onMovementAdded?.(); }}
                
                suppliers={suppliers}
                onStockUpdated={onStockUpdated}
              />
            )}

            {activeTab === 'Activity' && (
              <ProductActivity
                isNew={isNew}
                movements={inventoryHook.state.movements}
                movementsLoaded={inventoryHook.state.movementsLoaded}
              />
            )}
          </div>
        </div>

        <ProductFooter
          isPending={isPending}
          hasUnsavedChanges={hasUnsavedChanges}
          onSave={handleSave}
          onCancel={handleCloseRequest}
        />
      </div>
    </div>
  );
}
