'use client';

import { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Search, Plus, Minus, Trash2, Check, X,
  User, Phone, MapPin, CreditCard, Banknote, Smartphone,
  ShoppingBag, Printer, AlertCircle, Loader2, Sparkles, Tag,
  Camera, ScanLine, Volume2, VolumeX, CheckCircle2, Zap, Settings2, Barcode
} from 'lucide-react';
import { fetchPosProducts, createPosOrder, updateProductSku, PosLineItemInput } from './actions';

const BarcodeScanner = dynamic(() => import('../inventory/components/BarcodeScanner'), { ssr: false });

function playScanBeep(success = true) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1900, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(160, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch {
    // Web audio not allowed without user interaction
  }
}

type Product = {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  category: string | null;
  sku: string | null;
};

type CartItem = {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  stock: number;
  imageUrl: string | null;
};

interface PosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: any) => void;
  onPrintReceipt: (order: any) => void;
}

export default function PosModal({ isOpen, onClose, onOrderCreated, onPrintReceipt }: PosModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Barcode & Scanner Device State
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showDeviceDrawer, setShowDeviceDrawer] = useState(false);
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [scanNotification, setScanNotification] = useState<{ message: string; type: 'success' | 'error'; product?: Product; unknownBarcode?: string } | null>(null);
  const [quickBarcodeInput, setQuickBarcodeInput] = useState('');

  // SKU Registration Modal State
  const [registeringSku, setRegisteringSku] = useState<string | null>(null); // the barcode string to register
  const [targetProductForSku, setTargetProductForSku] = useState<Product | null>(null);
  const [skuModalSearch, setSkuModalSearch] = useState('');
  const [isSavingSku, setIsSavingSku] = useState(false);
  const [skuSaveError, setSkuSaveError] = useState('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [fulfillmentType, setFulfillmentType] = useState<'in_person' | 'delivery'>('in_person');
  const [deliveryCharge, setDeliveryCharge] = useState<number>(100);

  // Customer State
  const [isWalkIn, setIsWalkIn] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'card'>('cash');
  const [transactionRef, setTransactionRef] = useState('');
  const [orderNote, setOrderNote] = useState('');

  const [isPending, startTransition] = useTransition();
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoadingProducts(true);
      fetchPosProducts().then(res => {
        if (res.success && res.products) {
          setProducts(res.products as any);
        }
        setLoadingProducts(false);
      });
    }
  }, [isOpen]);

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev;
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        unitPrice: Number(product.price || 0),
        quantity: 1,
        stock: product.stock_quantity,
        imageUrl: product.image_url,
      }];
    });
  }, []);

  // Handle Barcode Lookup from Camera or Hardware USB/Bluetooth Scanner Gun
  const handleScannedBarcode = useCallback((rawCode: string) => {
    if (!rawCode) return;
    const code = rawCode.trim().toLowerCase();

    // Match by exact SKU, ID, or name
    const matched = products.find(p =>
      (p.sku && p.sku.toLowerCase() === code) ||
      (p.id && p.id.toLowerCase() === code) ||
      (p.name && p.name.toLowerCase() === code)
    );

    if (matched) {
      if (matched.stock_quantity <= 0) {
        if (audioFeedback) playScanBeep(false);
        setScanNotification({
          message: `Out of Stock: ${matched.name}`,
          type: 'error',
          product: matched,
        });
      } else {
        addToCart(matched);
        if (audioFeedback) playScanBeep(true);
        setScanNotification({
          message: `Scanned & Added: ${matched.name} (৳${Number(matched.price || 0).toLocaleString()})`,
          type: 'success',
          product: matched,
        });
      }
    } else {
      if (audioFeedback) playScanBeep(false);
      setScanNotification({
        message: `Unregistered Barcode / SKU: "${rawCode}"`,
        type: 'error',
        unknownBarcode: rawCode.trim(),
      });
    }

    setTimeout(() => {
      setScanNotification(prev => (prev?.unknownBarcode === rawCode.trim() ? prev : null));
    }, 5000);
  }, [products, audioFeedback, addToCart]);

  // Hardware USB/Bluetooth barcode scanner HID wedge listener
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 2) {
          handleScannedBarcode(buffer.trim());
          buffer = '';
          if (!isInput) {
            e.preventDefault();
          }
        }
      } else if (e.key.length === 1) {
        if (timeDiff > 220 && buffer.length > 0) {
          buffer = '';
        }
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleScannedBarcode]);

  // Handle Quick SKU Assignment to Product
  const handleAssignSku = async (productId: string, skuValue: string) => {
    setIsSavingSku(true);
    setSkuSaveError('');
    try {
      const res = await updateProductSku(productId, skuValue);
      if (!res.success) {
        setSkuSaveError(res.error || 'Failed to assign SKU.');
        setIsSavingSku(false);
        return;
      }

      // Update local products list
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, sku: skuValue.trim() } : p));
      
      // Auto add to cart if in stock
      const updatedProduct = products.find(p => p.id === productId);
      if (updatedProduct) {
        addToCart({ ...updatedProduct, sku: skuValue.trim() });
        if (audioFeedback) playScanBeep(true);
        setScanNotification({
          message: `SKU Registered & Added to Cart: ${updatedProduct.name}`,
          type: 'success',
          product: updatedProduct,
        });
      }

      setRegisteringSku(null);
      setTargetProductForSku(null);
      setSkuModalSearch('');
    } catch (err: any) {
      setSkuSaveError(err.message || 'Failed to save SKU.');
    } finally {
      setIsSavingSku(false);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const nextQty = item.quantity + delta;
        if (nextQty <= 0) return null;
        if (nextQty > item.stock) return item;
        return { ...item, quantity: nextQty };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const effectiveDelivery = fulfillmentType === 'delivery' ? deliveryCharge : 0;
  const grandTotal = Math.max(0, subtotal + effectiveDelivery - (Number(discountAmount) || 0));

  const handleCheckout = () => {
    setCheckoutError('');
    if (cart.length === 0) {
      setCheckoutError('Please add items to the cart.');
      return;
    }

    startTransition(async () => {
      const res = await createPosOrder({
        customerName: isWalkIn ? 'Walk-in Customer' : (customerName.trim() || 'Walk-in Customer'),
        customerPhone: isWalkIn ? 'Walk-in' : (customerPhone.trim() || 'Walk-in'),
        customerAddress: isWalkIn ? 'In-Store POS' : (customerAddress.trim() || 'Customer Address'),
        paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
        fulfillmentType,
        deliveryCharge: effectiveDelivery,
        discountAmount: Number(discountAmount) || 0,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          imageUrl: item.imageUrl,
        })),
        note: orderNote.trim() || undefined,
      });

      if (res.success && res.order) {
        onOrderCreated(res.order);
        onPrintReceipt(res.order);
        setCart([]);
        setDiscountAmount(0);
        setTransactionRef('');
        setOrderNote('');
        onClose();
      } else {
        setCheckoutError(res.error || 'Failed to complete sale.');
      }
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="bg-white rounded-cards border border-dove/20 shadow-2xl w-full max-w-6xl h-[94vh] max-h-[880px] overflow-hidden flex flex-col"
        >
          {/* ── Top POS Header ── */}
          <div className="px-6 py-3.5 border-b border-dove/10 flex items-center justify-between bg-fog/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-ink text-white flex items-center justify-center shadow-md">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-serif font-bold text-ink leading-tight">Point of Sale (POS)</h2>
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    In-Store Cashier
                  </span>
                  
                  {/* Live Barcode Gun Scanner Beacon */}
                  <button
                    type="button"
                    onClick={() => setShowDeviceDrawer(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer shadow-xs"
                    title="Configure Barcode Scanner Machine / Gun"
                  >
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <ScanLine className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Barcode Gun: Active</span>
                    <Settings2 className="w-3 h-3 opacity-60 ml-0.5" />
                  </button>
                </div>
                <p className="text-xs text-ash mt-0.5">Quick barcode checkout, live inventory sync & automated receipt printing</p>
              </div>
            </div>

            {/* Top Right High-Visibility Action Buttons */}
            <div className="flex items-center gap-2.5">
              {/* High-Visibility Camera Scan Button */}
              <button
                type="button"
                onClick={() => setShowCameraScanner(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
                title="Scan Barcode via Camera"
              >
                <Camera className="w-4 h-4" />
                <span>Camera Scan</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 text-ash hover:text-ink hover:bg-dove/15 rounded-full transition-colors cursor-pointer"
                title="Close POS Window"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── 2-Column Split: Left Catalog & Right Cart ── */}
          <div className="flex-1 flex flex-row min-h-0 overflow-hidden divide-x divide-dove/10">

            {/* LEFT: Product Catalog, Quick Barcode Scanner & Search */}
            <div className="flex-1 flex flex-col p-5 sm:p-6 min-h-0 min-w-0 bg-white overflow-hidden">
              
              {/* High-Visibility Scan Notification Banner */}
              <AnimatePresence>
                {scanNotification && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    className={`mb-4 p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-md ${
                      scanNotification.type === 'success'
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {scanNotification.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className="font-bold text-sm block truncate">{scanNotification.message}</span>
                        {scanNotification.unknownBarcode && (
                          <span className="text-[11px] opacity-90 block mt-0.5">
                            This barcode is not linked to any product SKU yet.
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {scanNotification.unknownBarcode && (
                        <button
                          type="button"
                          onClick={() => {
                            setRegisteringSku(scanNotification.unknownBarcode!);
                            setScanNotification(null);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-ink text-white font-bold text-xs hover:bg-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>+ Register SKU</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setScanNotification(null)}
                        className="p-1.5 opacity-70 hover:opacity-100 transition-opacity rounded-full hover:bg-black/10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Prominent Barcode Gun / SKU Quick-Scan & Search Toolbar ── */}
              <div className="space-y-3 mb-4 shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5">
                  
                  {/* Search / Barcode Input Box */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-graphite" />
                    <input
                      type="text"
                      placeholder="Search product name, or zap barcode gun (UPC / SKU)..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-10 pr-32 py-2.5 bg-fog border border-dove/20 rounded-2xl text-xs text-ink focus:outline-none focus:border-ink transition-colors shadow-xs"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowCameraScanner(true)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-[11px] font-bold shadow-sm transition-all cursor-pointer"
                        title="Scan Barcode via Camera"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Scan</span>
                      </button>
                    </div>
                  </div>

                  {/* Laser Scanner Test Input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (quickBarcodeInput.trim()) {
                        handleScannedBarcode(quickBarcodeInput.trim());
                        setQuickBarcodeInput('');
                      }
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <div className="relative">
                      <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                      <input
                        type="text"
                        placeholder="Scan / Type SKU..."
                        value={quickBarcodeInput}
                        onChange={e => setQuickBarcodeInput(e.target.value)}
                        className="w-40 sm:w-44 pl-9 pr-3 py-2.5 bg-emerald-50/60 border border-emerald-500/30 rounded-2xl text-xs font-mono font-bold text-ink focus:outline-none focus:border-emerald-600 transition-colors shadow-xs"
                        title="Point USB barcode scanner gun here or type SKU"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!quickBarcodeInput.trim()}
                      className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 disabled:opacity-40 transition-colors shadow-xs cursor-pointer"
                    >
                      Enter
                    </button>
                  </form>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {categories.map((cat) => (
                    <button
                      key={cat as string}
                      onClick={() => setSelectedCategory(cat as string)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap capitalize cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-ink text-white shadow-xs'
                          : 'bg-fog text-ash hover:text-ink hover:bg-dove/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Product Grid with Visible SKU Badges ── */}
              <div className="flex-1 overflow-y-auto pr-1">
                {loadingProducts ? (
                  <div className="h-full flex items-center justify-center text-xs text-ash">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading catalog…
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ash">
                    <Package className="w-8 h-8 opacity-30 mb-2" />
                    <p className="text-xs font-semibold text-ink">No matching products</p>
                    <p className="text-[11px] text-ash mt-0.5">Try searching with a different keyword or category.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredProducts.map((p) => {
                      const inCart = cart.find(item => item.productId === p.id);
                      const isOutOfStock = p.stock_quantity <= 0;

                      return (
                        <div
                          key={p.id}
                          className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all group relative ${
                            isOutOfStock
                              ? 'bg-fog/50 border-dove/10 opacity-50'
                              : inCart
                              ? 'bg-emerald-500/5 border-emerald-500/30 shadow-subtle'
                              : 'bg-white border-dove/15 hover:border-ink hover:shadow-subtle'
                          }`}
                        >
                          <div
                            onClick={() => !isOutOfStock && addToCart(p)}
                            className="cursor-pointer"
                          >
                            <div className="w-full h-28 bg-fog rounded-xl mb-2.5 overflow-hidden flex items-center justify-center border border-dove/10 relative">
                              {p.image_url ? (
                                <img src={p.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              ) : (
                                <Package className="w-7 h-7 text-ash" />
                              )}

                              {/* SKU Pill on Image */}
                              <div className="absolute top-2 left-2">
                                {p.sku ? (
                                  <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[9px] font-mono font-bold shadow-xs">
                                    SKU: {p.sku}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTargetProductForSku(p);
                                      setRegisteringSku('');
                                    }}
                                    className="px-2 py-0.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 text-[9px] font-bold shadow-xs cursor-pointer"
                                    title="Assign Barcode / SKU to this product"
                                  >
                                    + Set SKU
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-xs font-semibold text-ink line-clamp-2 leading-snug">{p.name}</p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[10px] text-ash font-mono">Stock: {p.stock_quantity}</p>
                              {p.sku && (
                                <span className="text-[10px] font-mono text-ash hover:text-ink cursor-pointer" title={`SKU: ${p.sku}`}>
                                  #{p.sku}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2.5 border-t border-dove/10 flex items-center justify-between w-full">
                            <span className="text-sm font-bold text-ink font-mono">৳{Number(p.price || 0).toLocaleString()}</span>
                            <button
                              type="button"
                              onClick={() => !isOutOfStock && addToCart(p)}
                              disabled={isOutOfStock}
                              className="p-1.5 rounded-lg bg-fog text-ink group-hover:bg-ink group-hover:text-white transition-colors cursor-pointer"
                              title="Add to cart"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Cart & Checkout Station */}
            <div className="w-[360px] md:w-[400px] lg:w-[420px] shrink-0 flex flex-col p-5 sm:p-6 bg-fog/40 min-h-0 overflow-y-auto">
              <h3 className="text-xs font-bold text-graphite uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Order Summary</span>
                <span className="text-ink font-mono">{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
              </h3>

              {/* Cart Items List */}
              <div className="bg-white rounded-2xl border border-dove/15 p-3 overflow-y-auto max-h-[200px] space-y-2 mb-4 shadow-xs">
                {cart.length === 0 ? (
                  <div className="h-24 flex flex-col items-center justify-center text-ash text-xs">
                    <ShoppingBag className="w-6 h-6 opacity-30 mb-1" />
                    Cart is empty. Scan barcodes or click items.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-2.5 rounded-xl bg-fog/40 text-xs border border-dove/10">
                      <div className="flex-1 pr-2 min-w-0">
                        <p className="font-semibold text-ink truncate leading-tight">{item.productName}</p>
                        <p className="text-[10px] text-ash font-mono mt-0.5">৳{item.unitPrice.toLocaleString()} each</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-white border border-dove/20 rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.productId, -1)}
                            className="p-1 hover:bg-fog text-ash hover:text-ink transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-mono font-semibold text-xs text-ink">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, 1)}
                            disabled={item.quantity >= item.stock}
                            className="p-1 hover:bg-fog text-ash hover:text-ink disabled:opacity-30 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-semibold text-ink font-mono w-14 text-right">
                          ৳{(item.quantity * item.unitPrice).toLocaleString()}
                        </span>

                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-ash hover:text-rust p-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Customer Details Accordion */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-graphite uppercase tracking-wider">Customer</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsWalkIn(true)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                        isWalkIn ? 'bg-ink text-white' : 'bg-white border border-dove/20 text-ash'
                      }`}
                    >
                      Walk-in
                    </button>
                    <button
                      onClick={() => setIsWalkIn(false)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                        !isWalkIn ? 'bg-ink text-white' : 'bg-white border border-dove/20 text-ash'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {!isWalkIn && (
                  <div className="space-y-2 bg-white p-3 rounded-2xl border border-dove/15">
                    <input
                      type="text"
                      placeholder="Customer Name"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-fog border border-dove/20 rounded-xl text-xs text-ink focus:outline-none focus:border-ink"
                    />
                    <input
                      type="text"
                      placeholder="Phone (017...)"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-fog border border-dove/20 rounded-xl text-xs text-ink focus:outline-none focus:border-ink"
                    />
                  </div>
                )}
              </div>

              {/* Payment Method Rail */}
              <div className="space-y-2 mb-4">
                <span className="text-[10px] font-bold text-graphite uppercase tracking-wider block">Payment Method</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'bkash', label: 'bKash', icon: Smartphone },
                    { id: 'nagad', label: 'Nagad', icon: Smartphone },
                    { id: 'card', label: 'Card', icon: CreditCard },
                  ].map((pm) => {
                    const isSelected = paymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id as any)}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-ink bg-ink text-white shadow-xs'
                            : 'border-dove/20 bg-white hover:border-dove/40 text-ink'
                        }`}
                      >
                        <pm.icon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-semibold">{pm.label}</span>
                      </button>
                    );
                  })}
                </div>

                {paymentMethod !== 'cash' && (
                  <input
                    type="text"
                    placeholder="Transaction Ref / Card Slip ID..."
                    value={transactionRef}
                    onChange={e => setTransactionRef(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-dove/20 rounded-xl text-xs text-ink focus:outline-none focus:border-ink mt-1.5"
                  />
                )}
              </div>

              {/* Discount & Delivery */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">Discount (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount || ''}
                    onChange={e => setDiscountAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-white border border-dove/20 rounded-xl text-xs text-ink focus:outline-none focus:border-ink"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">Fulfillment</label>
                  <select
                    value={fulfillmentType}
                    onChange={e => setFulfillmentType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-dove/20 rounded-xl text-xs text-ink focus:outline-none focus:border-ink"
                  >
                    <option value="in_person">Handover Now</option>
                    <option value="delivery">Courier Delivery</option>
                  </select>
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="pt-3 border-t border-dove/15 space-y-1.5 text-xs mt-auto">
                <div className="flex justify-between text-ash">
                  <span>Subtotal</span>
                  <span>৳{subtotal.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount</span>
                    <span>-৳{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                {fulfillmentType === 'delivery' && (
                  <div className="flex justify-between text-ash">
                    <span>Delivery Fee</span>
                    <span>+৳{deliveryCharge}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-ink pt-1 border-t border-dove/10">
                  <span>Total Due</span>
                  <span className="font-mono">৳{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {checkoutError && (
                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Complete Sale Button */}
              <button
                onClick={handleCheckout}
                disabled={isPending || cart.length === 0}
                className="w-full mt-4 py-3.5 rounded-full bg-ink text-white font-bold text-sm hover:bg-black active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording Sale…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Complete Sale (৳{grandTotal.toLocaleString()})
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Quick SKU Registration Modal ── */}
      <AnimatePresence>
        {(registeringSku !== null || targetProductForSku !== null) && (
          <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-dove/20 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-dove/10 flex items-center justify-between bg-fog/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Barcode className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">Register Barcode / SKU</h3>
                    <p className="text-[11px] text-ash">Link physical scanner barcode to inventory</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRegisteringSku(null);
                    setTargetProductForSku(null);
                    setSkuSaveError('');
                  }}
                  className="p-1.5 text-ash hover:text-ink rounded-full hover:bg-dove/15 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {targetProductForSku ? (
                  /* Case 1: Product was clicked, enter/scan barcode for it */
                  <div className="space-y-3">
                    <div className="p-3 bg-fog rounded-2xl border border-dove/15 flex items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-xl overflow-hidden shrink-0 border border-dove/10 flex items-center justify-center">
                        {targetProductForSku.image_url ? (
                          <img src={targetProductForSku.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-ash" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-ink text-sm">{targetProductForSku.name}</p>
                        <p className="text-ash text-xs">Price: ৳{targetProductForSku.price.toLocaleString()} · Stock: {targetProductForSku.stock_quantity}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-graphite uppercase tracking-wider mb-1">
                        Scan or Type Barcode / SKU
                      </label>
                      <input
                        type="text"
                        autoFocus
                        placeholder="Point scanner gun or type barcode..."
                        value={registeringSku || ''}
                        onChange={e => setRegisteringSku(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-emerald-50/50 border border-emerald-500/40 rounded-xl text-xs font-mono font-bold text-ink focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                ) : (
                  /* Case 2: Barcode was scanned, select which product to bind */
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Scanned Barcode</span>
                      <span className="text-base font-mono font-bold text-amber-950">{registeringSku}</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-graphite uppercase tracking-wider mb-1.5">
                        Select Product to Bind with this Barcode
                      </label>
                      <input
                        type="text"
                        placeholder="Filter products..."
                        value={skuModalSearch}
                        onChange={e => setSkuModalSearch(e.target.value)}
                        className="w-full px-3.5 py-2 bg-fog border border-dove/20 rounded-xl text-xs text-ink focus:outline-none focus:border-ink mb-2"
                      />

                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {products
                          .filter(p => !skuModalSearch || p.name.toLowerCase().includes(skuModalSearch.toLowerCase()))
                          .map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleAssignSku(p.id, registeringSku!)}
                              disabled={isSavingSku}
                              className="w-full p-2.5 rounded-xl border border-dove/15 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex items-center justify-between text-left cursor-pointer group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-fog border border-dove/10 overflow-hidden shrink-0 flex items-center justify-center">
                                  {p.image_url ? (
                                    <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <Package className="w-4 h-4 text-ash" />
                                  )}
                                </div>
                                <span className="font-semibold text-ink text-xs truncate">{p.name}</span>
                              </div>
                              <span className="text-xs font-bold font-mono text-emerald-700 shrink-0 group-hover:underline">
                                Bind & Add &rarr;
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {skuSaveError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{skuSaveError}</span>
                  </div>
                )}
              </div>

              {targetProductForSku && (
                <div className="px-6 py-3.5 border-t border-dove/10 bg-fog/40 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisteringSku(null);
                      setTargetProductForSku(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-ash hover:text-ink cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSavingSku || !registeringSku?.trim()}
                    onClick={() => handleAssignSku(targetProductForSku.id, registeringSku!.trim())}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-40"
                  >
                    {isSavingSku ? 'Saving…' : 'Save SKU & Bind'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Scanner Device Options Drawer / Modal ── */}
      <AnimatePresence>
        {showDeviceDrawer && (
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-dove/20 shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-dove/10 flex items-center justify-between bg-fog/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-ink text-white flex items-center justify-center shadow-xs">
                    <ScanLine className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">Barcode Scanner Machine Settings</h3>
                    <p className="text-[11px] text-ash">USB / Bluetooth Laser Gun & Camera Setup</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeviceDrawer(false)}
                  className="p-1.5 text-ash hover:text-ink rounded-full hover:bg-fog transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {/* Hardware Scanner Status */}
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-950 text-sm">Hardware Laser Scanner Gun</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-mono font-bold">READY</span>
                    </div>
                    <p className="text-[11px] text-emerald-900/80 mt-1 leading-relaxed">
                      Plug-and-play USB or Bluetooth scanner guns are automatically supported anywhere inside this POS window. Point and pull the trigger on any SKU or barcode to ring up items instantly.
                    </p>
                  </div>
                </div>

                {/* Camera Scanner Trigger */}
                <div className="p-4 rounded-2xl bg-fog border border-dove/15 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-ink">Built-in Device Camera</p>
                      <p className="text-[11px] text-ash">Continuous optical barcode & QR reader</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeviceDrawer(false);
                      setShowCameraScanner(true);
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Open Camera
                  </button>
                </div>

                {/* Audio Feedback Toggle */}
                <div className="p-4 rounded-2xl bg-fog border border-dove/15 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white text-graphite flex items-center justify-center shrink-0 border border-dove/20">
                      {audioFeedback ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-ash" />}
                    </div>
                    <div>
                      <p className="font-bold text-ink">Scan Beep Sound</p>
                      <p className="text-[11px] text-ash">Audible feedback on barcode matches</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => playScanBeep(true)}
                      className="px-2.5 py-1 text-[10px] rounded-lg bg-white border border-dove/20 text-ash hover:text-ink font-semibold transition-colors"
                      title="Test Audio Beep"
                    >
                      Test Beep
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioFeedback(v => !v)}
                      className={`relative w-10 h-5.5 rounded-full transition-colors ${audioFeedback ? 'bg-emerald-600' : 'bg-dove/40'}`}
                    >
                      <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${audioFeedback ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-dove/10 bg-fog/40 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeviceDrawer(false)}
                  className="px-4 py-2 rounded-full bg-ink text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Camera Barcode Scanner Modal ── */}
      {showCameraScanner && (
        <BarcodeScanner
          onResult={(text) => {
            handleScannedBarcode(text);
          }}
          onClose={() => setShowCameraScanner(false)}
        />
      )}
    </>
  );
}
