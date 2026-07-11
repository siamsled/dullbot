'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileDown, AlertCircle, Check, X, Loader2, FileText } from 'lucide-react';
import { importCSV, type CSVRow } from '../actions';

interface ParsedRow extends CSVRow {
  _index: number;
  _errors: string[];
}

const CSV_HEADERS = ['name', 'description', 'price', 'stock', 'sku', 'category'];
const BOM = '\uFEFF'; // UTF-8 BOM for Excel Bengali name support

function parseCSV(text: string): ParsedRow[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const nameIdx = header.indexOf('name');
  const priceIdx = header.indexOf('price');
  const stockIdx = header.indexOf('stock');
  const descIdx = header.indexOf('description');
  const skuIdx = header.indexOf('sku');
  const categoryIdx = header.indexOf('category');

  return lines.slice(1).map((line, i) => {
    // Handle quoted fields with commas
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { cols.push(current.trim()); current = ''; }
      else { current += char; }
    }
    cols.push(current.trim());

    const errors: string[] = [];
    const name = nameIdx >= 0 ? cols[nameIdx]?.replace(/"/g, '') ?? '' : '';
    const priceStr = priceIdx >= 0 ? cols[priceIdx]?.replace(/"/g, '') ?? '' : '';
    const stockStr = stockIdx >= 0 ? cols[stockIdx]?.replace(/"/g, '') ?? '' : '0';
    const price = parseFloat(priceStr);
    const stock = parseInt(stockStr, 10);

    if (!name) errors.push('Name is required');
    if (!priceStr || isNaN(price) || price <= 0) errors.push('Price must be a positive number');
    if (isNaN(stock) || stock < 0) errors.push('Stock must be 0 or greater');

    return {
      _index: i + 1,
      _errors: errors,
      name,
      description: descIdx >= 0 ? cols[descIdx]?.replace(/"/g, '') ?? '' : '',
      price: isNaN(price) ? 0 : price,
      stock: isNaN(stock) ? 0 : stock,
      sku: skuIdx >= 0 ? cols[skuIdx]?.replace(/"/g, '') ?? '' : '',
      category: categoryIdx >= 0 ? cols[categoryIdx]?.replace(/"/g, '') ?? '' : '',
    };
  }).filter(r => r.name || r._errors.length);
}

function downloadTemplate() {
  const template = [
    CSV_HEADERS.join(','),
    '"Marigold Honey","100% pure raw honey",850,50,HONEY-001,Food',
    '"সিল্ক শাড়ি","হাতে বোনা বেনারসি সিল্ক শাড়ি",4500,10,SAREE-BEN-001,Clothing',
  ].join('\n');

  const blob = new Blob([BOM + template], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'inventory_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export default function CSVImport({ onClose, onImported }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; count?: number; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setResult({ error: 'Please upload a .csv file' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRows(parseCSV(text));
      setResult(null);
    };
    reader.readAsText(file, 'UTF-8');
  }, []);

  const validRows = rows.filter(r => r._errors.length === 0);
  const hasErrors = rows.some(r => r._errors.length > 0);

  const handleImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    try {
      const res = await importCSV(validRows.map(r => ({
        name: r.name,
        description: r.description,
        price: r.price,
        stock: r.stock,
        sku: r.sku,
        category: r.category,
      })));
      if (res.error) {
        setResult({ error: res.error });
      } else {
        setResult({ success: true, count: res.count });
        onImported();
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-cards shadow-subtle w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-dove/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-graphite" />
            <h2 className="text-base font-medium text-ink">Bulk CSV Import</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-buttons border border-dove/30 text-xs text-ash hover:text-ink hover:border-ink/30 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              Download Template
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-graphite hover:text-ink hover:bg-fog transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Drop zone */}
          {!rows.length && (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-cards p-12 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-ink bg-fog' : 'border-dove/40 hover:border-ink/30 hover:bg-fog/50'
              }`}
            >
              <Upload className="w-10 h-10 text-dove mx-auto mb-3" />
              <p className="text-sm font-medium text-ink mb-1">Drop your CSV file here</p>
              <p className="text-xs text-ash">or click to browse — UTF-8 encoding recommended</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          )}

          {/* Required columns notice */}
          {!rows.length && (
            <div className="bg-sky-wash rounded-xl p-4">
              <p className="text-xs font-medium text-ink mb-1.5">Required columns (case-insensitive)</p>
              <div className="flex flex-wrap gap-1.5">
                {CSV_HEADERS.map(h => (
                  <code key={h} className={`text-xs px-2 py-0.5 rounded-tags font-mono ${
                    ['name', 'price', 'stock'].includes(h) ? 'bg-ink text-white' : 'bg-white text-ink border border-dove/20'
                  }`}>
                    {h} {['name', 'price', 'stock'].includes(h) ? '*' : ''}
                  </code>
                ))}
              </div>
              <p className="text-xs text-ash mt-2">* Required. Optional fields may be omitted.</p>
            </div>
          )}

          {/* Preview Table */}
          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{rows.length} rows parsed</p>
                  <p className="text-xs text-ash">
                    {validRows.length} valid · {rows.filter(r => r._errors.length > 0).length} with errors
                  </p>
                </div>
                <button
                  onClick={() => { setRows([]); setResult(null); }}
                  className="text-xs text-ash hover:text-ink transition-colors"
                >
                  Clear & re-upload
                </button>
              </div>

              {hasErrors && (
                <div className="flex items-start gap-2 bg-apricot-wash rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-rust shrink-0 mt-0.5" />
                  <p className="text-xs text-rust">
                    Rows with errors will be skipped. Fix them in your CSV and re-upload, or proceed to import only the valid rows.
                  </p>
                </div>
              )}

              <div className="border border-dove/10 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-fog text-ash uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5 font-medium w-6">#</th>
                      <th className="px-4 py-2.5 font-medium">Name</th>
                      <th className="px-4 py-2.5 font-medium text-right">Price</th>
                      <th className="px-4 py-2.5 font-medium text-right">Stock</th>
                      <th className="px-4 py-2.5 font-medium">SKU</th>
                      <th className="px-4 py-2.5 font-medium">Category</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dove/10">
                    {rows.map(r => (
                      <tr
                        key={r._index}
                        className={r._errors.length ? 'bg-red-50/50' : 'hover:bg-fog/50'}
                      >
                        <td className="px-4 py-2 text-dove">{r._index}</td>
                        <td className="px-4 py-2 text-ink font-medium max-w-[150px] truncate">{r.name || <span className="text-dove italic">—</span>}</td>
                        <td className="px-4 py-2 text-right text-ink">৳{r.price.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-ink">{r.stock}</td>
                        <td className="px-4 py-2 text-ash">{r.sku || '—'}</td>
                        <td className="px-4 py-2 text-ash">{r.category || '—'}</td>
                        <td className="px-4 py-2">
                          {r._errors.length ? (
                            <div className="flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                              <span className="text-red-600 text-xs leading-tight">{r._errors.join(', ')}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-green-600">
                              <Check className="w-3 h-3" />
                              <span>Valid</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Result message */}
          {result && (
            <div className={`rounded-xl p-4 flex items-start gap-3 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
              {result.success ? (
                <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.success
                  ? `Successfully imported ${result.count} product${result.count !== 1 ? 's' : ''} into your catalogue.`
                  : result.error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dove/10 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-ash hover:text-ink transition-colors"
          >
            {result?.success ? 'Close' : 'Cancel'}
          </button>
          {validRows.length > 0 && !result?.success && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-buttons bg-ink text-white text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import {validRows.length} Product{validRows.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
