'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Plus, Search, Trash2, Edit2, X, Clock, DollarSign, Loader2 } from 'lucide-react';
import { upsertService, deleteService, toggleServiceActive } from './actions';

interface Service {
  id: string;
  shop_id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  active: boolean;
  created_at: string;
}

interface Props {
  shopId: string;
  initialServices: Service[];
}

export default function ServicesClient({ shopId, initialServices }: Props) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // Slide-over form state
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60');
  const [active, setActive] = useState(true);

  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openAdd = () => {
    setEditingService(null);
    setName('');
    setDescription('');
    setPrice('');
    setDuration('60');
    setActive(true);
    setFormError('');
    setSlideOverOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description || '');
    setPrice(service.price.toString());
    setDuration(service.duration_minutes.toString());
    setActive(service.active);
    setFormError('');
    setSlideOverOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setFormError('Service name is required.');
    if (!price.trim() || isNaN(Number(price))) return setFormError('Valid price is required.');
    
    setIsSaving(true);
    setFormError('');

    const res = await upsertService(shopId, {
      id: editingService?.id,
      name,
      description,
      price: Number(price),
      duration_minutes: Number(duration),
      active,
    });

    setIsSaving(false);
    if (res.success && res.data) {
      const saved = res.data as Service;
      if (editingService) {
        setServices(prev => prev.map(s => s.id === saved.id ? saved : s));
      } else {
        setServices(prev => [saved, ...prev]);
      }
      setSlideOverOpen(false);
    } else {
      setFormError(res.error || 'Failed to save service.');
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    startTransition(async () => {
      const res = await deleteService(shopId, id);
      if (res.success) {
        setServices(prev => prev.filter(s => s.id !== id));
      } else {
        alert(res.error || 'Failed to delete service.');
      }
    });
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    startTransition(async () => {
      const nextActive = !currentActive;
      const res = await toggleServiceActive(shopId, id, nextActive);
      if (res.success) {
        setServices(prev => prev.map(s => s.id === id ? { ...s, active: nextActive } : s));
      } else {
        alert(res.error || 'Failed to toggle status.');
      }
    });
  };

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative min-h-screen select-none">
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex justify-between items-start flex-wrap gap-4"
      >
        <div>
          <h1 className="text-4xl font-serif text-ink tracking-tight mb-2">Services</h1>
          <p className="text-ash text-sm">
            {services.filter(s => s.active).length} active service{services.filter(s => s.active).length !== 1 ? 's' : ''} listed
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white hover:bg-black rounded-buttons text-xs font-semibold shadow-subtle transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </motion.div>

      {/* Search Bar */}
      <div className="mb-6 relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dove" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search services..."
          className="w-full pl-9 pr-4 py-2 text-xs border border-dove/25 rounded-lg focus:outline-none focus:border-ink transition-colors"
        />
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map(service => (
          <motion.div
            key={service.id}
            layout
            className={`bg-white rounded-cards border p-5 flex flex-col justify-between shadow-subtle hover:shadow-hover transition-all duration-200 ${
              service.active ? 'border-dove/20' : 'border-dove/10 opacity-70'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-sm text-ink truncate">{service.name}</h3>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  service.active ? 'bg-green-100 text-green-800' : 'bg-dove/10 text-ash'
                }`}>
                  {service.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-ash leading-relaxed mb-4 min-h-[40px] line-clamp-3">
                {service.description || 'No description provided.'}
              </p>
            </div>

            <div className="border-t border-dove/10 pt-4 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1 text-[11px] text-ash">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{service.duration_minutes} mins</span>
                </div>
                <div className="flex items-center gap-0.5 text-sm font-semibold text-ink">
                  <span>৳</span>
                  <span>{service.price}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleActive(service.id, service.active)}
                  className={`text-[10px] font-medium px-2 py-1.5 rounded-lg border transition-colors ${
                    service.active 
                      ? 'border-dove/20 text-ash hover:border-ink hover:text-ink'
                      : 'border-green-200 text-green-700 hover:bg-green-50'
                  }`}
                >
                  {service.active ? 'Pause' : 'Activate'}
                </button>
                <button
                  onClick={() => openEdit(service)}
                  className="p-2 rounded-lg text-dove hover:text-ink hover:bg-fog transition-colors border border-transparent hover:border-dove/10"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="p-2 rounded-lg text-dove hover:text-rust hover:bg-apricot-wash transition-colors border border-transparent hover:border-dove/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredServices.length === 0 && (
          <div className="col-span-full py-16 text-center text-ash text-xs">
            No services found. Click "Add Service" to create one.
          </div>
        )}
      </div>

      {/* Slide-over Form */}
      <AnimatePresence>
        {slideOverOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSlideOverOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Slide-over Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 p-8 flex flex-col justify-between border-l border-dove/10"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-serif text-ink">
                    {editingService ? 'Edit Service' : 'Add Service'}
                  </h2>
                  <button
                    onClick={() => setSlideOverOpen(false)}
                    className="p-1 rounded-lg text-dove hover:text-ink transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Service Name</label>
                    <input
                      type="text"
                      value={name}
                      required
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Premium Hair Cut"
                      className="w-full text-xs border border-dove/25 rounded-lg px-3 py-2.5 focus:outline-none focus:border-ink transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Description</label>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what is included in the service..."
                      className="w-full text-xs border border-dove/25 rounded-lg px-3 py-2.5 focus:outline-none focus:border-ink resize-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">Price (BDT)</label>
                      <input
                        type="text"
                        value={price}
                        required
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full text-xs border border-dove/25 rounded-lg px-3 py-2.5 focus:outline-none focus:border-ink transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">Duration (minutes)</label>
                      <input
                        type="text"
                        value={duration}
                        required
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="e.g. 60"
                        className="w-full text-xs border border-dove/25 rounded-lg px-3 py-2.5 focus:outline-none focus:border-ink transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="active"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="rounded border-dove/30 text-ink focus:ring-ink"
                    />
                    <label htmlFor="active" className="text-xs font-medium text-ink">Active (visible to bot &amp; catalog)</label>
                  </div>

                  {formError && (
                    <p className="text-xs text-rust bg-apricot-wash p-2.5 rounded-lg border border-rust/10 font-medium">
                      {formError}
                    </p>
                  )}
                </form>
              </div>

              <div className="border-t border-dove/10 pt-4 flex gap-3">
                <button
                  onClick={() => setSlideOverOpen(false)}
                  className="flex-1 py-2.5 border border-dove/20 text-ink hover:bg-fog rounded-buttons text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-ink text-white hover:bg-black rounded-buttons text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Service'
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
