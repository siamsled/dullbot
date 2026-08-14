/**
 * Reusable, print-optimized Receipt & Invoice Generator for DullBot.
 * Supports 80mm POS Thermal printers and A4 / A5 Full Color modern invoices.
 */

export interface ReceiptCustomConfig {
  storeName?: string;
  tagline?: string;
  phone?: string;
  address?: string;
  websiteOrSocial?: string;
  accentColor?: string; // Hex e.g. #17191c, #059669, #4f46e5, #d97706, #e11d48
  footerNote?: string;
  termsNote?: string;
  showLogo?: boolean;
  logoUrl?: string;
}

export interface PrintableOrder {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  totalAmount: number;
  paymentMethod?: string;
  paymentTransactionRef?: string;
  courierProvider?: string;
  courierTrackingId?: string;
  lineItems: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
}

export function generatePrintHTML(
  orders: PrintableOrder[],
  docType: 'receipt' | 'packing_slip' | 'label',
  copies: number = 1,
  pageSize: 'thermal_80mm' | 'a4' | 'a5' = 'thermal_80mm',
  config?: ReceiptCustomConfig
): string {
  const storeName = config?.storeName || 'Dull Store';
  const tagline = config?.tagline || 'Automated Social Commerce & Retail';
  const phone = config?.phone || '+880 1700-000000';
  const address = config?.address || 'Dhaka, Bangladesh';
  const website = config?.websiteOrSocial || 'dullbot.com';
  const accentColor = config?.accentColor || '#17191c';
  const footerNote = config?.footerNote || 'Thank you for shopping with us!';
  const termsNote = config?.termsNote || 'Exchanges accepted within 7 days with original invoice.';
  const logoUrl = config?.logoUrl;

  const isA4 = pageSize === 'a4' || pageSize === 'a5';
  const padded = Array.from({ length: copies }, () => orders).flat();

  if (isA4) {
    // ══════════════════════════════════════════════════════════════════
    // A4 / A5 MODERN FULL-COLOR INVOICE TEMPLATE
    // ══════════════════════════════════════════════════════════════════
    const docBlocks = padded.map((o) => {
      const orderDate = new Date(o.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const subtotal = o.lineItems.reduce((sum, li) => sum + (li.quantity * li.unit_price), 0);
      const deliveryFee = o.totalAmount > subtotal ? o.totalAmount - subtotal : 0;
      const discount = subtotal + deliveryFee > o.totalAmount ? (subtotal + deliveryFee - o.totalAmount) : 0;

      return `
      <div class="a4-page">
        <!-- Header Banner -->
        <div class="invoice-header">
          <div class="brand-left">
            ${logoUrl ? `<img src="${logoUrl}" alt="${storeName}" class="brand-logo-img" style="max-height: 48px; max-width: 140px; object-fit: contain; margin-right: 14px; border-radius: 6px;" />` : `<div class="logo-mark" style="background: ${accentColor};">${storeName.slice(0, 2).toUpperCase()}</div>`}
            <div>
              <h1 class="store-title">${storeName}</h1>
              <p class="store-tagline">${tagline}</p>
              <p class="store-meta">${address} · ${phone} · ${website}</p>
            </div>
          </div>
          <div class="invoice-meta-right">
            <div class="invoice-badge" style="border-color: ${accentColor}; color: ${accentColor};">
              INVOICE
            </div>
            <div class="meta-line"><span class="meta-lbl">Invoice #:</span> <strong>#${o.id.slice(0, 8).toUpperCase()}</strong></div>
            <div class="meta-line"><span class="meta-lbl">Issue Date:</span> ${orderDate}</div>
            <div class="meta-line"><span class="meta-lbl">Status:</span> <span class="paid-tag">PAID</span></div>
          </div>
        </div>

        <div class="divider-line" style="background: ${accentColor};"></div>

        <!-- Bill To & Logistics Cards -->
        <div class="info-grid">
          <div class="info-card">
            <div class="card-title">BILLED & SHIPPED TO</div>
            <div class="info-body">
              <p class="customer-name">${o.customerName}</p>
              <p class="customer-phone">${o.customerPhone || 'Walk-in Customer'}</p>
              <p class="customer-addr">${o.customerAddress || 'In-Store Pickup'}</p>
            </div>
          </div>
          <div class="info-card">
            <div class="card-title">PAYMENT & FULFILLMENT</div>
            <div class="info-body">
              <p><strong>Method:</strong> <span class="capitalize">${o.paymentMethod || 'Cash'}</span></p>
              ${o.paymentTransactionRef ? `<p><strong>Trx Ref:</strong> <code class="mono-ref">${o.paymentTransactionRef}</code></p>` : ''}
              ${o.courierTrackingId ? `<p><strong>Courier:</strong> ${o.courierProvider?.toUpperCase() || 'EXPRESS'} (Tracking: ${o.courierTrackingId})</p>` : '<p><strong>Courier:</strong> Direct Handover / POS</p>'}
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr style="background: ${accentColor}; color: #ffffff;">
              <th style="width: 45%;">Item Description</th>
              <th style="width: 15%; text-align: center;">Qty</th>
              <th style="width: 20%; text-align: right;">Unit Price</th>
              <th style="width: 20%; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${o.lineItems.map((li, idx) => `
              <tr class="${idx % 2 === 1 ? 'even-row' : ''}">
                <td class="item-name">
                  <strong>${li.product_name}</strong>
                </td>
                <td style="text-align: center;" class="mono">${li.quantity}</td>
                <td style="text-align: right;" class="mono">৳${li.unit_price.toLocaleString()}</td>
                <td style="text-align: right;" class="mono">৳${(li.quantity * li.unit_price).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals & Notes Summary -->
        <div class="bottom-summary">
          <div class="notes-box">
            <p class="notes-header">TERMS & RETURN POLICY</p>
            <p class="notes-text">${termsNote}</p>
            <p class="thankyou-text">${footerNote}</p>
          </div>

          <div class="totals-box">
            <div class="total-row"><span>Subtotal:</span> <span class="mono">৳${subtotal.toLocaleString()}</span></div>
            ${deliveryFee > 0 ? `<div class="total-row"><span>Delivery Fee:</span> <span class="mono">+৳${deliveryFee.toLocaleString()}</span></div>` : ''}
            ${discount > 0 ? `<div class="total-row discount"><span>Discount:</span> <span class="mono">-৳${discount.toLocaleString()}</span></div>` : ''}
            <div class="grand-total-row" style="background: ${accentColor}10; border-color: ${accentColor};">
              <span style="color: ${accentColor}; font-weight: bold;">TOTAL PAID:</span>
              <span class="mono grand-total-amt" style="color: ${accentColor};">৳${o.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <!-- Footer watermark -->
        <div class="invoice-footer">
          <span>Generated by ${storeName} · DullBot POS Commerce</span>
          <span>Verified Digital Receipt</span>
        </div>
      </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice — ${storeName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.45;
    background: #f4f5f7;
    color: #17191c;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .a4-page {
    width: 210mm;
    min-height: 297mm;
    margin: 20px auto;
    padding: 36px 44px;
    background: #ffffff;
    border-radius: 4px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    page-break-after: always;
    display: flex;
    flex-direction: column;
  }
  .a4-page:last-child { page-break-after: avoid; }
  .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .brand-left { display: flex; align-items: center; gap: 16px; }
  .logo-mark { width: 46px; height: 46px; border-radius: 10px; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; letter-spacing: -0.5px; }
  .store-title { font-size: 20px; font-weight: 700; color: #17191c; letter-spacing: -0.5px; margin-bottom: 2px; }
  .store-tagline { font-size: 12px; color: #64748b; margin-bottom: 3px; }
  .store-meta { font-size: 11px; color: #94a3b8; }
  .invoice-meta-right { text-align: right; }
  .invoice-badge { display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: 2px; padding: 4px 12px; border: 1.5px solid; border-radius: 6px; margin-bottom: 8px; text-transform: uppercase; }
  .meta-line { font-size: 12px; color: #475569; margin-top: 3px; }
  .meta-lbl { color: #94a3b8; margin-right: 4px; }
  .paid-tag { background: #dcfce7; color: #166534; font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid #bbf7d0; }
  .divider-line { height: 2.5px; width: 100%; border-radius: 2px; margin-bottom: 24px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; }
  .card-title { font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
  .customer-name { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
  .customer-phone, .customer-addr { font-size: 12px; color: #475569; margin-top: 2px; }
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; border-radius: 6px; overflow: hidden; }
  .items-table th { padding: 10px 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .items-table td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; }
  .even-row { background: #f8fafc; }
  .mono { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
  .mono-ref { font-family: monospace; font-size: 11px; background: #e2e8f0; padding: 1px 4px; border-radius: 3px; }
  .bottom-summary { display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; margin-top: auto; padding-top: 16px; }
  .notes-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; }
  .notes-header { font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 1px; margin-bottom: 4px; }
  .notes-text { font-size: 11px; color: #64748b; line-height: 1.5; }
  .thankyou-text { font-size: 12px; font-weight: 600; color: #334155; margin-top: 10px; }
  .totals-box { display: flex; flex-direction: column; gap: 8px; justify-content: flex-end; }
  .total-row { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; padding: 0 4px; }
  .total-row.discount { color: #166534; font-weight: 600; }
  .grand-total-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid; border-radius: 8px; font-size: 14px; margin-top: 4px; }
  .grand-total-amt { font-size: 17px; font-weight: 700; }
  .invoice-footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
  .capitalize { text-transform: capitalize; }
  @media print {
    body { background: #ffffff; margin: 0; padding: 0; }
    .a4-page { width: 100%; margin: 0; padding: 24mm 20mm; box-shadow: none; border-radius: 0; min-height: auto; }
    @page { size: A4 portrait; margin: 0; }
  }
</style>
</head>
<body>${docBlocks}</body>
</html>`;
  }

  // ══════════════════════════════════════════════════════════════════
  // 80MM POS THERMAL PRINTER TEMPLATE (STREAMLINED & CRISP)
  // ══════════════════════════════════════════════════════════════════
  const docBlocks = padded.map((o) => {
    const subtotal = o.lineItems.reduce((sum, li) => sum + (li.quantity * li.unit_price), 0);
    const orderDate = new Date(o.createdAt).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
    <div class="thermal-doc">
      <div class="header-center">
        ${logoUrl ? `<img src="${logoUrl}" alt="${storeName}" style="max-height: 44px; max-width: 120px; object-fit: contain; margin: 0 auto 6px auto; display: block; filter: grayscale(100%) contrast(160%);" />` : ''}
        <h1 class="store-name">${storeName}</h1>
        <p class="tagline">${tagline}</p>
        <p class="contact-info">${phone} · ${address}</p>
      </div>

      <div class="dashed-divider"></div>

      <div class="meta-row">
        <span>Order #: <strong>#${o.id.slice(0, 8)}</strong></span>
        <span>${orderDate}</span>
      </div>
      <div class="meta-row">
        <span>Customer: ${o.customerName}</span>
        <span>${o.customerPhone || 'POS'}</span>
      </div>

      <div class="dashed-divider"></div>

      <div class="table-header">
        <span style="flex: 2;">ITEM</span>
        <span style="flex: 1; text-align: center;">QTY</span>
        <span style="flex: 1; text-align: right;">PRICE</span>
        <span style="flex: 1; text-align: right;">TOTAL</span>
      </div>
      <div class="solid-divider"></div>

      ${o.lineItems.map(li => `
        <div class="item-row">
          <span style="flex: 2; font-weight: bold;" class="truncate">${li.product_name}</span>
          <span style="flex: 1; text-align: center;">×${li.quantity}</span>
          <span style="flex: 1; text-align: right;">${li.unit_price}</span>
          <span style="flex: 1; text-align: right; font-weight: bold;">৳${(li.quantity * li.unit_price).toLocaleString()}</span>
        </div>
      `).join('')}

      <div class="dashed-divider"></div>

      <div class="calc-row"><span>Subtotal:</span> <span>৳${subtotal.toLocaleString()}</span></div>
      ${o.totalAmount > subtotal ? `<div class="calc-row"><span>Delivery:</span> <span>৳${(o.totalAmount - subtotal).toLocaleString()}</span></div>` : ''}
      <div class="calc-row grand-total">
        <span>TOTAL PAID:</span>
        <span class="total-price">৳${o.totalAmount.toLocaleString()}</span>
      </div>

      <div class="dashed-divider"></div>

      <div class="meta-row"><span>Payment:</span> <span class="capitalize">${o.paymentMethod || 'Cash'}</span></div>
      ${o.paymentTransactionRef ? `<div class="meta-row"><span>Trx Ref:</span> <span>${o.paymentTransactionRef}</span></div>` : ''}

      <div class="footer-center">
        <p class="footer-note">${footerNote}</p>
        <p class="terms-note">${termsNote}</p>
        <p class="powered-by">Powered by DullBot POS</p>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Receipt — ${storeName}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', monospace;
    font-size: 11px;
    background: #ffffff;
    color: #000000;
  }
  .thermal-doc {
    width: 80mm;
    margin: 0 auto 15px;
    padding: 10px 12px;
    page-break-after: always;
  }
  .thermal-doc:last-child { page-break-after: avoid; }
  .header-center { text-align: center; margin-bottom: 6px; }
  .store-name { font-size: 15px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
  .tagline { font-size: 10px; color: #444; margin-bottom: 2px; }
  .contact-info { font-size: 9px; color: #666; }
  .dashed-divider { border-top: 1px dashed #444; margin: 6px 0; }
  .solid-divider { border-top: 1px solid #000; margin: 4px 0; }
  .meta-row { display: flex; justify-content: space-between; font-size: 10px; margin: 2px 0; }
  .table-header { display: flex; font-size: 9px; font-weight: bold; text-transform: uppercase; color: #222; }
  .item-row { display: flex; font-size: 10px; margin: 3px 0; line-height: 1.2; }
  .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .calc-row { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
  .calc-row.grand-total { font-size: 13px; font-weight: 800; margin-top: 4px; padding-top: 2px; }
  .total-price { font-size: 14px; font-weight: 900; }
  .footer-center { text-align: center; margin-top: 10px; }
  .footer-note { font-weight: bold; font-size: 10px; margin-bottom: 2px; }
  .terms-note { font-size: 9px; color: #555; margin-bottom: 4px; }
  .powered-by { font-size: 8px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .capitalize { text-transform: capitalize; }
  @media print {
    body { margin: 0; padding: 0; }
    .thermal-doc { width: 80mm; margin: 0; padding: 6px 8px; }
    @page { size: 80mm auto; margin: 0; }
  }
</style>
</head>
<body>${docBlocks}</body>
</html>`;
}
