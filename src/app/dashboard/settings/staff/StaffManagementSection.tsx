'use client';

import { useState, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Shield, KeyRound, Check, X,
  Trash2, AlertTriangle, UserCheck, UserX, Loader2, Sparkles, ChevronRight
} from 'lucide-react';
import {
  listStaffMembers,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  StaffMember
} from './actions';
import { StaffRole } from '@/lib/supabase-admin';

const PERMISSION_OPTIONS = [
  { id: 'overview', label: 'Store Overview', desc: 'View store metrics, revenue cards, and quick summary' },
  { id: 'orders', label: 'Orders & Fulfillment', desc: 'View, verify payments, and dispatch courier orders' },
  { id: 'pos', label: 'Point of Sale (POS)', desc: 'Create manual in-store walk-in sales & print receipts' },
  { id: 'inbox', label: 'Live Inbox', desc: 'Read customer messages and take over chat conversations' },
  { id: 'inventory', label: 'Inventory & Catalog', desc: 'Add, update stock, edit pricing and products' },
  { id: 'analytics', label: 'Analytics & Reports', desc: 'View revenue graphs, sales trends and export data' },
  { id: 'settings', label: 'Store Settings & Staff', desc: 'Manage channels, payments and employee access' },
];

const ROLE_PRESETS: { id: StaffRole; label: string; desc: string; perms: string[] }[] = [
  {
    id: 'cashier',
    label: 'Cashier / POS Operator',
    desc: 'Strictly limited to taking sales and managing orders',
    perms: ['overview', 'orders', 'pos'],
  },
  {
    id: 'support',
    label: 'Customer Support',
    desc: 'Chat communication and order status lookup',
    perms: ['overview', 'inbox', 'orders'],
  },
  {
    id: 'manager',
    label: 'Store Manager',
    desc: 'Full operational control over catalog, sales, and analytics',
    perms: ['overview', 'orders', 'pos', 'inbox', 'inventory', 'analytics'],
  },
  {
    id: 'custom',
    label: 'Custom Role',
    desc: 'Configure tailored access per employee',
    perms: ['overview', 'orders', 'pos'],
  },
];

export default function StaffManagementSection({ shopId, isOwner }: { shopId: string; isOwner: boolean }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<StaffRole>('cashier');
  const [selectedPerms, setSelectedPerms] = useState<string[]>(['overview', 'orders', 'pos']);
  const [formError, setFormError] = useState('');

  const loadStaff = async () => {
    setLoading(true);
    const res = await listStaffMembers(shopId);
    if (res.success && res.staff) {
      setStaff(res.staff);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOwner) {
      loadStaff();
    }
  }, [shopId, isOwner]);

  const handleRoleSelect = (roleId: StaffRole) => {
    setSelectedRole(roleId);
    const preset = ROLE_PRESETS.find(r => r.id === roleId);
    if (preset && roleId !== 'custom') {
      setSelectedPerms(preset.perms);
    }
  };

  const togglePermission = (permId: string) => {
    setSelectedPerms(prev => {
      const next = prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId];
      if (selectedRole !== 'custom') {
        setSelectedRole('custom');
      }
      return next;
    });
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim() || !password.trim()) {
      setFormError('Email and password are required.');
      return;
    }

    startTransition(async () => {
      const res = await createStaffMember(shopId, {
        fullName: fullName.trim(),
        email: email.trim(),
        password: password.trim(),
        role: selectedRole,
        permissions: selectedPerms,
      });

      if (res.success) {
        setModalOpen(false);
        setFullName('');
        setEmail('');
        setPassword('');
        setSelectedRole('cashier');
        setSelectedPerms(['overview', 'orders', 'pos']);
        await loadStaff();
      } else {
        setFormError(res.error || 'Failed to create staff member.');
      }
    });
  };

  const handleToggleStatus = (staffMember: StaffMember) => {
    const nextStatus = staffMember.status === 'active' ? 'suspended' : 'active';
    startTransition(async () => {
      const res = await updateStaffMember(staffMember.id, { status: nextStatus });
      if (res.success) {
        setStaff(prev => prev.map(s => s.id === staffMember.id ? { ...s, status: nextStatus } : s));
      } else {
        alert(res.error || 'Failed to update status.');
      }
    });
  };

  const handleDelete = (staffMember: StaffMember) => {
    if (confirm(`Revoke all access and delete employee account for ${staffMember.fullName} (${staffMember.email})?`)) {
      startTransition(async () => {
        const res = await deleteStaffMember(staffMember.id);
        if (res.success) {
          setStaff(prev => prev.filter(s => s.id !== staffMember.id));
        } else {
          alert(res.error || 'Failed to delete staff member.');
        }
      });
    }
  };

  if (!isOwner) {
    return null; // Staff members cannot manage other staff
  }

  return (
    <div className="bg-white rounded-cards shadow-subtle border border-dove/10 p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-ink text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Employee Logins & Permissions</h3>
            <p className="text-xs text-ash">Control granular access for cashiers, support reps, and managers</p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-ink text-white rounded-buttons text-xs font-semibold hover:bg-black transition-all shadow-subtle cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Employee
        </button>
      </div>

      {/* Staff List */}
      {loading ? (
        <div className="py-8 flex items-center justify-center text-ash text-xs">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading team members…
        </div>
      ) : staff.length === 0 ? (
        <div className="py-6 px-4 bg-fog rounded-inputs border border-dove/10 text-center">
          <p className="text-xs font-semibold text-ink mb-1">No employees added yet</p>
          <p className="text-[11px] text-ash max-w-sm mx-auto leading-relaxed">
            Create employee logins to give cashiers or support agents restricted access without sharing your owner credentials.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-dove/10 border border-dove/10 rounded-inputs overflow-hidden">
          {staff.map((s) => (
            <div key={s.id} className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-fog/30 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{s.fullName}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                    s.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    {s.status}
                  </span>
                  <span className="px-2 py-0.5 bg-fog text-graphite rounded-md text-[10px] font-medium border border-dove/10 capitalize">
                    {s.role}
                  </span>
                </div>
                <p className="text-xs text-ash font-mono mt-0.5">{s.email}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.permissions.map((p) => (
                    <span key={p} className="text-[9px] font-semibold bg-dove/10 text-graphite px-2 py-0.5 rounded uppercase tracking-wider">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => handleToggleStatus(s)}
                  disabled={isPending}
                  title={s.status === 'active' ? 'Suspend access' : 'Activate access'}
                  className={`px-3 py-1.5 rounded-buttons text-xs font-semibold border transition-all ${
                    s.status === 'active'
                      ? 'bg-white text-ash border-dove/20 hover:text-rust hover:border-rust/30'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {s.status === 'active' ? 'Suspend' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  disabled={isPending}
                  className="p-1.5 text-ash hover:text-rust rounded-lg hover:bg-rose-50 transition-colors"
                  title="Delete employee account"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-cards border border-dove/20 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-dove/10 flex items-center justify-between bg-fog/30">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-ink" />
                  <h3 className="text-sm font-semibold text-ink">Add New Employee</h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 text-ash hover:text-ink rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleCreateStaff} className="p-6 overflow-y-auto space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-inputs text-red-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tanvir Ahmed"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-fog border border-dove/20 rounded-inputs text-xs text-ink focus:outline-none focus:border-ink transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">
                      Employee Email / ID
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="staff@store.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-fog border border-dove/20 rounded-inputs text-xs text-ink focus:outline-none focus:border-ink transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-1">
                    Initial Password (min 6 chars)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-fog border border-dove/20 rounded-inputs text-xs text-ink focus:outline-none focus:border-ink transition-colors"
                  />
                  <p className="text-[10px] text-ash mt-1">Staff will use this password to sign in on the employee portal.</p>
                </div>

                {/* Role Presets */}
                <div>
                  <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-2">
                    Role Preset
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLE_PRESETS.map((preset) => {
                      const isSelected = selectedRole === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleRoleSelect(preset.id)}
                          className={`p-2.5 rounded-inputs border text-left flex flex-col transition-all cursor-pointer ${
                            isSelected
                              ? 'border-ink bg-ink text-white shadow-subtle'
                              : 'border-dove/20 bg-white hover:border-dove/40 text-ink'
                          }`}
                        >
                          <span className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-ink'}`}>
                            {preset.label}
                          </span>
                          <span className={`text-[9px] mt-0.5 leading-tight ${isSelected ? 'text-white/70' : 'text-ash'}`}>
                            {preset.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Granular Permissions Checkbox Matrix */}
                <div>
                  <label className="block text-[10px] font-bold text-graphite uppercase tracking-wider mb-2">
                    Granular Access Permissions
                  </label>
                  <div className="space-y-1.5 bg-fog/50 p-3 rounded-inputs border border-dove/10">
                    {PERMISSION_OPTIONS.map((opt) => {
                      const checked = selectedPerms.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className="flex items-start gap-2.5 p-1.5 rounded hover:bg-white transition-colors cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermission(opt.id)}
                            className="mt-0.5 rounded border-dove/30 text-ink focus:ring-ink"
                          />
                          <div>
                            <span className="text-xs font-semibold text-ink block leading-tight">{opt.label}</span>
                            <span className="text-[10px] text-ash leading-snug">{opt.desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-dove/10 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-fog text-ink font-semibold rounded-buttons text-xs hover:bg-dove/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 bg-ink text-white font-semibold rounded-buttons text-xs hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-subtle cursor-pointer"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save Employee
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
