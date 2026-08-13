'use client';

import { useState, useTransition } from 'react';
import { Plus, Pencil, Trash2, Phone, Loader2, X, Check, Building2 } from 'lucide-react';
import { addSupplier, updateSupplier, deleteSupplier } from '../actions';

export type Supplier = {
  id: string;
  name: string;
  contact_phone?: string | null;
  contact_note?: string | null;
  created_at?: string;
};

interface Props {
  suppliers: Supplier[];
}

export default function SuppliersTab({ suppliers: initialSuppliers }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', contact_phone: '', contact_note: '' });
  const [isPending, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', contact_phone: '', contact_note: '' });
    setShowModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, contact_phone: s.contact_phone ?? '', contact_note: s.contact_note ?? '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    startTransition(async () => {
      if (editing) {
        await updateSupplier(editing.id, {
          name: form.name,
          contact_phone: form.contact_phone || undefined,
          contact_note: form.contact_note || undefined,
        });
        setSuppliers(prev => prev.map(s => s.id === editing.id ? { ...s, ...form } : s));
      } else {
        await addSupplier({
          name: form.name,
          contact_phone: form.contact_phone || undefined,
          contact_note: form.contact_note || undefined,
        });
        // Optimistic: add placeholder — real data re-loads on next server fetch
        setSuppliers(prev => [...prev, { id: `tmp-${Date.now()}`, name: form.name, contact_phone: form.contact_phone, contact_note: form.contact_note }]);
      }
      setShowModal(false);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteSupplier(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      setDeleteConfirm(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-ink">Suppliers</h2>
          <p className="text-sm text-ash mt-0.5">Manage your restocking contacts and suppliers.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-buttons bg-ink text-white text-sm font-medium hover:bg-black transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Supplier
        </button>
      </div>

      {/* List */}
      {suppliers.length === 0 ? (
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-12 text-center">
          <Building2 className="w-10 h-10 text-dove mx-auto mb-3" />
          <p className="text-sm font-medium text-ink mb-1">No suppliers yet</p>
          <p className="text-xs text-ash mb-4">Add suppliers to link them to restocking actions and product defaults.</p>
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-buttons bg-ink text-white text-sm font-medium hover:bg-black transition-colors"
          >
            Add your first supplier
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#151921] rounded-cards shadow-subtle border border-dove/10 relative">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-dove/15 text-[10px] font-bold text-graphite uppercase tracking-wider">
                <th className="sticky top-0 z-20 bg-fog/95 dark:bg-[#1e2330]/80 backdrop-blur-md px-5 py-3 font-bold text-graphite uppercase tracking-wider border-b border-dove/15 shadow-xs">Name</th>
                <th className="sticky top-0 z-20 bg-fog/95 dark:bg-[#1e2330]/80 backdrop-blur-md px-5 py-3 font-bold text-graphite uppercase tracking-wider border-b border-dove/15 shadow-xs">Phone</th>
                <th className="sticky top-0 z-20 bg-fog/95 dark:bg-[#1e2330]/80 backdrop-blur-md px-5 py-3 font-bold text-graphite uppercase tracking-wider border-b border-dove/15 shadow-xs">Note</th>
                <th className="sticky top-0 z-20 bg-fog/95 dark:bg-[#1e2330]/80 backdrop-blur-md px-5 py-3 font-bold text-graphite uppercase tracking-wider text-right border-b border-dove/15 shadow-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dove/10">
              {suppliers.map(s => (
                <tr key={s.id} className="hover:bg-fog/50 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-medium text-ink">{s.name}</span>
                  </td>
                  <td className="px-5 py-3">
                    {s.contact_phone ? (
                      <a href={`tel:${s.contact_phone}`} className="flex items-center gap-1 text-ash hover:text-ink transition-colors">
                        <Phone className="w-3 h-3" />
                        {s.contact_phone}
                      </a>
                    ) : <span className="text-dove">—</span>}
                  </td>
                  <td className="px-5 py-3 text-ash max-w-[200px] truncate">
                    {s.contact_note || <span className="text-dove">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {deleteConfirm === s.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-ash">Delete?</span>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={isPending}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="p-1.5 rounded-lg bg-fog text-ash hover:text-ink transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-lg text-graphite hover:text-ink hover:bg-fog transition-colors"
                          title="Edit supplier"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(s.id)}
                          className="p-1.5 rounded-lg text-graphite hover:text-rust hover:bg-apricot-wash transition-colors"
                          title="Delete supplier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-cards shadow-subtle w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-dove/10">
              <h3 className="text-base font-medium text-ink">
                {editing ? 'Edit Supplier' : 'New Supplier'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-graphite hover:text-ink hover:bg-fog transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-ash mb-1.5">
                  Supplier Name <span className="text-rust">*</span>
                </label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Dhaka Textile Mills"
                  className="w-full bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ash mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={form.contact_phone}
                  onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                  placeholder="+880 1234 567890"
                  className="w-full bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ash mb-1.5">Notes</label>
                <textarea
                  value={form.contact_note}
                  onChange={e => setForm(f => ({ ...f, contact_note: e.target.value }))}
                  placeholder="Payment terms, delivery window, etc."
                  rows={3}
                  className="w-full bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-dove/10 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-ash hover:text-ink transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-buttons bg-ink text-white text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editing ? 'Save Changes' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
