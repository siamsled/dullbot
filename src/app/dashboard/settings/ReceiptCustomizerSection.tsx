'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Printer, Palette, Type, MapPin, Phone, Globe,
  FileText, Check, Eye, Sparkles, RefreshCw, ZoomIn, ZoomOut
} from 'lucide-react';
import { generatePrintHTML, ReceiptCustomConfig, PrintableOrder } from '@/lib/receipt-generator';

const ACCENT_COLORS = [
  { label: 'Midnight Ink', hex: '#17191c' },
  { label: 'Emerald Forest', hex: '#059669' },
  { label: 'Royal Indigo', hex: '#4f46e5' },
  { label: 'Sapphire Blue', hex: '#2563eb' },
  { label: 'Warm Amber', hex: '#d97706' },
  { label: 'Crimson Rose', hex: '#e11d48' },
];

const DUMMY_PREVIEW_ORDER: PrintableOrder = {
  id: 'dull-ord-892401',
  createdAt: new Date().toISOString(),
  customerName: 'Ayesha Rahman',
  customerPhone: '+880 1712-345678',
  customerAddress: 'House 42, Road 11, Banani, Dhaka',
  totalAmount: 3600,
  paymentMethod: 'bKash',
  paymentTransactionRef: '9X2J19A87K',
  courierProvider: 'Pathao',
  courierTrackingId: 'PTH-889104',
  lineItems: [
    { product_name: 'Premium Linen Panjabi — Navy M', quantity: 1, unit_price: 2400 },
    { product_name: 'Cotton Embroidered Stole', quantity: 1, unit_price: 1100 },
  ],
};

const RECEIPT_CONFIG_KEY = 'dullbot_receipt_custom_config';

interface Props {
  shopName: string;
  shopPhone?: string;
  shopAddress?: string;
  onConfigChange?: (config: ReceiptCustomConfig) => void;
}

export default function ReceiptCustomizerSection({ shopName, shopPhone, shopAddress, onConfigChange }: Props) {
  const [storeName, setStoreName] = useState(shopName || 'Dull Store');
  const [tagline, setTagline] = useState('Automated Social Commerce & Retail');
  const [phone, setPhone] = useState(shopPhone || '+880 1700-000000');
  const [address, setAddress] = useState(shopAddress || 'Dhaka, Bangladesh');
  const [websiteOrSocial, setWebsiteOrSocial] = useState('instagram.com/dullstore');
  const [accentColor, setAccentColor] = useState('#17191c');
  const [footerNote, setFooterNote] = useState('Thank you for shopping with us! Scan to follow our new arrivals.');
  const [termsNote, setTermsNote] = useState('Exchanges accepted within 7 days with original invoice. No cash refund.');
  
  // Preview mode toggle
  const [previewPageSize, setPreviewPageSize] = useState<'thermal_80mm' | 'a4'>('a4');
  const [previewZoom, setPreviewZoom] = useState<number>(65);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECEIPT_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.storeName) setStoreName(parsed.storeName);
        if (parsed.tagline) setTagline(parsed.tagline);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.address) setAddress(parsed.address);
        if (parsed.websiteOrSocial) setWebsiteOrSocial(parsed.websiteOrSocial);
        if (parsed.accentColor) setAccentColor(parsed.accentColor);
        if (parsed.footerNote) setFooterNote(parsed.footerNote);
        if (parsed.termsNote) setTermsNote(parsed.termsNote);
      }
    } catch {}
  }, []);

  const currentConfig: ReceiptCustomConfig = {
    storeName,
    tagline,
    phone,
    address,
    websiteOrSocial,
    accentColor,
    footerNote,
    termsNote,
  };

  const handleFieldChange = (setter: (v: string) => void, val: string) => {
    setter(val);
    setPreviewKey(k => k + 1);
    const updated = { ...currentConfig, storeName: val };
    localStorage.setItem(RECEIPT_CONFIG_KEY, JSON.stringify(currentConfig));
    if (onConfigChange) onConfigChange(currentConfig);
  };

  const previewHTML = generatePrintHTML(
    [DUMMY_PREVIEW_ORDER],
    'receipt',
    1,
    previewPageSize,
    currentConfig
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: Customization Controls */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Brand Identity */}
          <div className="bg-fog p-4 rounded-inputs border border-dove/10 space-y-3">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-graphite" /> Header & Brand Details
            </h4>

            <div>
              <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">Store / Business Name</label>
              <input
                type="text"
                value={storeName}
                onChange={e => handleFieldChange(setStoreName, e.target.value)}
                className="w-full px-3 py-2 bg-white border border-dove/20 rounded-inputs text-xs text-ink focus:outline-none focus:border-ink shadow-xs"
                placeholder="Store Name"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">Tagline / Subtitle</label>
              <input
                type="text"
                value={tagline}
                onChange={e => handleFieldChange(setTagline, e.target.value)}
                className="w-full px-3 py-2 bg-white border border-dove/20 rounded-inputs text-xs text-ink focus:outline-none focus:border-ink shadow-xs"
                placeholder="e.g. Modern Fashion & Accessories"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => handleFieldChange(setPhone, e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-dove/20 rounded-inputs text-xs text-ink focus:outline-none focus:border-ink shadow-xs"
                  placeholder="+880 1700-000000"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">Social / Website</label>
                <input
                  type="text"
                  value={websiteOrSocial}
                  onChange={e => handleFieldChange(setWebsiteOrSocial, e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-dove/20 rounded-inputs text-xs text-ink focus:outline-none focus:border-ink shadow-xs"
                  placeholder="instagram.com/store"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">Physical Address</label>
              <input
                type="text"
                value={address}
                onChange={e => handleFieldChange(setAddress, e.target.value)}
                className="w-full px-3 py-2 bg-white border border-dove/20 rounded-inputs text-xs text-ink focus:outline-none focus:border-ink shadow-xs"
                placeholder="Store address..."
              />
            </div>
          </div>

          {/* Color & Accent */}
          <div className="bg-fog p-4 rounded-inputs border border-dove/10 space-y-3">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-graphite" /> Brand Accent Color (For A4 Color Printers)
            </h4>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {ACCENT_COLORS.map(c => {
                const isSelected = accentColor === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => {
                      setAccentColor(c.hex);
                      setPreviewKey(k => k + 1);
                      localStorage.setItem(RECEIPT_CONFIG_KEY, JSON.stringify({ ...currentConfig, accentColor: c.hex }));
                    }}
                    className={`p-2 rounded-inputs border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected ? 'border-ink bg-white shadow-subtle' : 'border-dove/20 bg-white/50 hover:bg-white'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full shadow-xs flex items-center justify-center text-white" style={{ background: c.hex }}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className="text-[9px] font-semibold text-ink truncate w-full text-center">{c.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer & Return Terms */}
          <div className="bg-fog p-4 rounded-inputs border border-dove/10 space-y-3">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-graphite" /> Policy & Footer Notice
            </h4>

            <div>
              <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">Return & Warranty Policy</label>
              <textarea
                rows={2}
                value={termsNote}
                onChange={e => handleFieldChange(setTermsNote, e.target.value)}
                className="w-full px-3 py-2 bg-white border border-dove/20 rounded-inputs text-xs text-ink focus:outline-none focus:border-ink shadow-xs resize-none"
                placeholder="Return policy..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">Thank You Note</label>
              <input
                type="text"
                value={footerNote}
                onChange={e => handleFieldChange(setFooterNote, e.target.value)}
                className="w-full px-3 py-2 bg-white border border-dove/20 rounded-inputs text-xs text-ink focus:outline-none focus:border-ink shadow-xs"
                placeholder="Thank you message..."
              />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Live Interactive Print Preview */}
        <div className="lg:col-span-6 flex flex-col bg-fog rounded-cards border border-dove/15 p-4 min-h-[550px]">
          <div className="flex items-center justify-between pb-3 border-b border-dove/10 mb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-ink" />
              <span className="text-xs font-bold text-ink uppercase tracking-wider">Live Template Preview</span>
            </div>

            {/* Right controls: format switcher & zoom */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white p-0.5 rounded-inputs border border-dove/20 shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewPageSize('a4');
                    setPreviewZoom(65);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-inputs transition-all cursor-pointer ${
                    previewPageSize === 'a4'
                      ? 'bg-ink text-white shadow-xs'
                      : 'text-ash hover:text-ink'
                  }`}
                >
                  A4 Color Invoice
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewPageSize('thermal_80mm');
                    setPreviewZoom(100);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-inputs transition-all cursor-pointer ${
                    previewPageSize === 'thermal_80mm'
                      ? 'bg-ink text-white shadow-xs'
                      : 'text-ash hover:text-ink'
                  }`}
                >
                  80mm Thermal (POS)
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-dove/15 shadow-xs">
                <button
                  type="button"
                  onClick={() => setPreviewZoom(z => Math.max(30, z - 10))}
                  title="Zoom Out (−)"
                  className="p-1 rounded-md hover:bg-fog text-ink transition-colors cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewZoom(previewPageSize === 'a4' ? 65 : 100)}
                  title="Reset Zoom"
                  className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-ink hover:bg-fog rounded-md transition-colors cursor-pointer min-w-[38px] text-center"
                >
                  {previewZoom}%
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewZoom(z => Math.min(180, z + 10))}
                  title="Zoom In (+)"
                  className="p-1 rounded-md hover:bg-fog text-ink transition-colors cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Iframe preview container with scalable canvas */}
          <div className="flex-1 bg-white rounded-inputs border border-dove/20 overflow-auto shadow-subtle flex justify-center items-start p-3 min-h-[480px]">
            <div
              style={{
                transform: `scale(${previewZoom / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.12s ease-out',
                width: previewPageSize === 'a4' ? '820px' : '380px',
                minHeight: previewPageSize === 'a4' ? '1160px' : '550px',
                marginBottom: `${Math.max(20, (previewZoom / 100) * (previewPageSize === 'a4' ? 300 : 100))}px`,
              }}
              className="shrink-0 bg-white rounded-xl shadow-md border border-dove/20 overflow-hidden"
            >
              <iframe
                key={`${previewKey}-${previewPageSize}-${accentColor}`}
                srcDoc={previewHTML}
                title="Live Receipt Preview"
                className="w-full h-full border-none"
                style={{
                  width: previewPageSize === 'a4' ? '820px' : '380px',
                  minHeight: previewPageSize === 'a4' ? '1160px' : '550px',
                  height: '100%',
                }}
                sandbox="allow-same-origin"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between text-[11px] text-ash">
            <span>Changes reflect instantly across all POS checkouts & order downloads</span>
            <button
              type="button"
              onClick={() => {
                const win = window.open('', '_blank');
                if (!win) return;
                win.document.write(previewHTML);
                win.document.close();
                win.focus();
                setTimeout(() => { win.print(); }, 400);
              }}
              className="font-semibold text-ink hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Test Print
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
