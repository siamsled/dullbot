'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Send, Trash2, Package, Plus, ExternalLink,
  ChevronRight, ChevronDown, Loader2, X, Settings, AlertTriangle,
  Megaphone, RefreshCw, Image as ImageIcon, CheckCircle2, Sparkles,
  ArrowDown, ArrowUp, AlertCircle, Search, ShieldCheck, Check,
  Bot, Clock, User, MessageCircle, Sliders, Filter, CornerDownRight,
  Eye, Heart, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  upsertPostAutomation,
  deletePostAutomation,
  fetchPostPreview,
  getCommentStats,
  fetchConnectedSocialPosts,
  togglePostAutomationStatus,
  fetchPostComments,
  ConnectedPostItem,
  CommentDetailItem,
} from './actions';

type Product = {
  id: string;
  name: string;
  price: number;
  currency: string;
  image_url: string | null;
};

type PostAutomation = {
  id: string;
  post_id: string;
  post_platform: 'facebook' | 'instagram';
  post_preview_text: string | null;
  post_thumbnail_url: string | null;
  reply_as_comment: boolean;
  instructions: string | null;
  delete_negative: boolean;
  delete_examples: string[];
  send_as_messenger: boolean;
  product_ids: string[];
  updated_at: string;
};

type CommentStats = {
  total: number;
  replied: number;
  privateReplied: number;
  deleted: number;
};

// ─── Platform / Channel Icon ────────────────────────────────────────────────
function ChannelIcon({ channel, className = 'w-4 h-4' }: { channel?: string; className?: string }) {
  if (channel === 'instagram') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.082.3 2.23.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26 6.559-6.963 3.13 3.26 5.888-3.26-6.559 6.963z"/>
    </svg>
  );
}

// ─── iOS Green Switch ───────────────────────────────────────────────────────
function IosGreenSwitch({ value, onChange, disabled, size = 'normal' }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean; size?: 'normal' | 'sm' }) {
  if (size === 'sm') {
    return (
      <button
        type="button"
        onClick={() => !disabled && onChange(!value)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
          value ? 'bg-[#22C55E]' : 'bg-dove/30'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${value ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        value ? 'bg-[#22C55E]' : 'bg-dove/30'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${value ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
    </button>
  );
}

// ─── Add Post Modal ──────────────────────────────────────────────────────────
function AddPostModal({
  connectedPosts,
  isConnected,
  onClose,
  onAdded,
}: {
  connectedPosts: ConnectedPostItem[];
  isConnected: boolean | null;
  onClose: () => void;
  onAdded: (automation: PostAutomation) => void;
}) {
  const [tab, setTab] = useState<'connected' | 'url'>(isConnected && connectedPosts.length > 0 ? 'connected' : 'url');
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<'facebook' | 'instagram'>('facebook');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ post_id: string; post_preview_text: string; post_thumbnail_url: string | null } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFetch = async () => {
    setFetching(true);
    setError('');
    const result = await fetchPostPreview(url.trim());
    setFetching(false);
    if (!result) {
      setError('Could not fetch post. Make sure your Facebook page is connected in Settings.');
      return;
    }
    setPreview({ ...result, post_preview_text: result.post_preview_text || '' });
  };

  const handleSelectPost = async (post: ConnectedPostItem) => {
    setSaving(true);
    const result = await upsertPostAutomation({
      post_id: post.post_id,
      post_platform: post.platform,
      post_preview_text: post.preview_text,
      post_thumbnail_url: post.thumbnail_url || undefined,
      reply_as_comment: true,
      delete_negative: false,
      send_as_messenger: true,
      product_ids: [],
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Failed to add automation');
      return;
    }
    onAdded({
      id: '',
      post_id: post.post_id,
      post_platform: post.platform,
      post_preview_text: post.preview_text,
      post_thumbnail_url: post.thumbnail_url,
      reply_as_comment: true,
      instructions: null,
      delete_negative: false,
      delete_examples: [],
      send_as_messenger: true,
      product_ids: [],
      updated_at: new Date().toISOString(),
    });
  };

  const handleAddManual = async () => {
    if (!preview) return;
    setSaving(true);
    const result = await upsertPostAutomation({
      post_id: preview.post_id,
      post_platform: platform,
      post_preview_text: preview.post_preview_text,
      post_thumbnail_url: preview.post_thumbnail_url || undefined,
      reply_as_comment: true,
      delete_negative: false,
      send_as_messenger: true,
      product_ids: [],
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Failed to add automation');
      return;
    }
    onAdded({
      id: '',
      post_id: preview.post_id,
      post_platform: platform,
      post_preview_text: preview.post_preview_text,
      post_thumbnail_url: preview.post_thumbnail_url,
      reply_as_comment: true,
      instructions: null,
      delete_negative: false,
      delete_examples: [],
      send_as_messenger: true,
      product_ids: [],
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-dove/20 w-full max-w-lg p-6 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-ink">Add Post Automation</h3>
            <p className="text-xs text-ash">Select a published post or paste a direct post link.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-ash hover:text-ink rounded-lg hover:bg-fog transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-dove/15 shrink-0 gap-2">
          <button
            onClick={() => setTab('connected')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
              tab === 'connected' ? 'border-ink text-ink' : 'border-transparent text-ash hover:text-ink'
            }`}
          >
            Published Social Posts ({connectedPosts.length})
          </button>
          <button
            onClick={() => setTab('url')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
              tab === 'url' ? 'border-ink text-ink' : 'border-transparent text-ash hover:text-ink'
            }`}
          >
            Paste Direct URL
          </button>
        </div>

        {tab === 'connected' && (
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[260px] max-h-[360px]">
            {connectedPosts.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Megaphone className="w-8 h-8 text-ash mx-auto opacity-30" />
                <p className="text-xs font-semibold text-ink">No published posts found</p>
                <p className="text-[11px] text-ash max-w-xs mx-auto">
                  {isConnected
                    ? 'Publish a post on Facebook or Instagram, or paste a post URL manually.'
                    : 'Connect your Facebook Page or Instagram in Settings.'}
                </p>
              </div>
            ) : (
              connectedPosts.map((p) => (
                <div key={p.post_id} className="flex items-center gap-3 p-3 bg-fog/60 hover:bg-fog rounded-xl border border-dove/15 hover:border-dove/30 transition-all">
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt="Post" className="w-12 h-12 object-cover rounded-lg shrink-0 border border-dove/15" />
                  ) : (
                    <div className="w-12 h-12 bg-white rounded-lg shrink-0 flex items-center justify-center border border-dove/15">
                      <ImageIcon className="w-4 h-4 text-graphite" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink line-clamp-2">{p.preview_text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                        p.platform === 'instagram'
                          ? 'bg-pink-50 text-pink-700 border-pink-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {p.platform}
                      </span>
                      <span className="text-[10px] text-ash">
                        {new Date(p.created_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectPost(p)}
                    disabled={saving}
                    className="px-3 py-1.5 bg-ink text-white rounded-lg text-xs font-bold hover:bg-black disabled:opacity-40 transition-colors shrink-0 flex items-center gap-1 shadow-xs"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Automate
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'url' && (
          <div className="space-y-3 shrink-0 py-2">
            <div>
              <label className="text-[10px] font-bold text-graphite uppercase tracking-wider block mb-1.5">Platform</label>
              <div className="flex gap-2">
                {(['facebook', 'instagram'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-bold capitalize transition-all ${
                      platform === p ? 'bg-ink text-white border-ink' : 'bg-fog border-dove/20 text-graphite hover:border-dove/40'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-graphite uppercase tracking-wider block mb-1.5">Post URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://www.facebook.com/photo?..."
                  className="flex-1 px-3 py-2 bg-fog border border-dove/20 rounded-xl text-xs focus:outline-none focus:border-ink transition-all"
                />
                <button
                  onClick={handleFetch}
                  disabled={!url.trim() || fetching}
                  className="px-3 py-2 bg-ink text-white rounded-xl text-xs font-bold hover:bg-black disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Fetch
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-rust font-medium">{error}</p>}

            {preview && (
              <div className="flex items-start gap-3 p-3 bg-fog rounded-xl border border-dove/15">
                {preview.post_thumbnail_url ? (
                  <img src={preview.post_thumbnail_url} alt="Post" className="w-12 h-12 object-cover rounded-lg shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-white rounded-lg shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink line-clamp-3">{preview.post_preview_text || '(no caption)'}</p>
                  <p className="text-[10px] text-graphite font-mono mt-0.5">{preview.post_id}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-dove/10">
              <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-ash hover:text-ink transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAddManual}
                disabled={!preview || saving}
                className="px-4 py-2 bg-ink text-white rounded-xl text-xs font-bold hover:bg-black disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Add Automation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Rightmost Column: Automation Settings Panel ─────────────────────────────
function AutomationTweaksPanel({
  post,
  automation,
  products,
  isToggling,
  onToggleMaster,
  onSaved,
  onDeleted,
}: {
  post: ConnectedPostItem;
  automation: PostAutomation | null;
  products: Product[];
  isToggling: boolean;
  onToggleMaster: (enabled: boolean) => void;
  onSaved: (updated: PostAutomation) => void;
  onDeleted: () => void;
}) {
  const isEnabled = !!automation;

  const [config, setConfig] = useState<PostAutomation>({
    id: automation?.id || '',
    post_id: post.post_id,
    post_platform: post.platform,
    post_preview_text: post.preview_text,
    post_thumbnail_url: post.thumbnail_url,
    reply_as_comment: automation?.reply_as_comment ?? true,
    instructions: automation?.instructions ?? '',
    delete_negative: automation?.delete_negative ?? false,
    delete_examples: automation?.delete_examples ?? [],
    send_as_messenger: automation?.send_as_messenger ?? true,
    product_ids: automation?.product_ids ?? [],
    updated_at: automation?.updated_at || new Date().toISOString(),
  });

  const [newDeleteExample, setNewDeleteExample] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [saveToast, setSaveToast] = useState(false);

  // Sync state when automation changes
  useEffect(() => {
    if (automation) {
      setConfig({
        id: automation.id,
        post_id: automation.post_id,
        post_platform: automation.post_platform,
        post_preview_text: automation.post_preview_text,
        post_thumbnail_url: automation.post_thumbnail_url,
        reply_as_comment: automation.reply_as_comment,
        instructions: automation.instructions || '',
        delete_negative: automation.delete_negative,
        delete_examples: automation.delete_examples || [],
        send_as_messenger: automation.send_as_messenger,
        product_ids: automation.product_ids || [],
        updated_at: automation.updated_at,
      });
    }
  }, [automation, post.post_id]);

  const toggleProduct = (id: string) => {
    setConfig(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(id)
        ? prev.product_ids.filter(p => p !== id)
        : [...prev.product_ids, id],
    }));
  };

  const addDeleteExample = () => {
    if (!newDeleteExample.trim()) return;
    setConfig(prev => ({
      ...prev,
      delete_examples: [...(prev.delete_examples || []), newDeleteExample.trim()],
    }));
    setNewDeleteExample('');
  };

  const removeDeleteExample = (i: number) => {
    setConfig(prev => ({
      ...prev,
      delete_examples: prev.delete_examples.filter((_, idx) => idx !== i),
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await upsertPostAutomation({
        post_id: post.post_id,
        post_platform: post.platform,
        post_preview_text: post.preview_text,
        post_thumbnail_url: post.thumbnail_url || undefined,
        reply_as_comment: config.reply_as_comment,
        instructions: config.instructions || undefined,
        delete_negative: config.delete_negative,
        delete_examples: config.delete_examples,
        send_as_messenger: config.send_as_messenger,
        product_ids: config.product_ids,
      });

      if (result.success) {
        setSaveToast(true);
        onSaved(config);
        setTimeout(() => setSaveToast(false), 3000);
      }
    });
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [products, productSearch]);

  return (
    <div className="h-full flex flex-col bg-white border-l border-dove/15">
      {/* Header */}
      <div className="p-4 border-b border-dove/10 flex items-center justify-between shrink-0 bg-fog/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-ink text-white flex items-center justify-center shadow-xs">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink leading-none">Automation Settings</h3>
            <p className="text-[11px] text-ash mt-0.5">Rules & AI behaviors for this post</p>
          </div>
        </div>

        {saveToast && (
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in">
            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" /> Saved
          </span>
        )}
      </div>

      {/* Settings Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Master Switch Card */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isEnabled ? 'bg-emerald-50/50 border-emerald-200/80 shadow-subtle' : 'bg-fog/60 border-dove/20'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isEnabled ? 'bg-emerald-500 text-white shadow-xs' : 'bg-dove/30 text-graphite'
              }`}>
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink">
                  {isEnabled ? 'Automate Comments: ON' : 'Automate Comments: OFF'}
                </h4>
                <p className="text-[10px] text-ash">
                  {isEnabled ? 'AI actively answering comments' : 'Post automation paused'}
                </p>
              </div>
            </div>
            <IosGreenSwitch
              value={isEnabled}
              disabled={isToggling}
              onChange={onToggleMaster}
            />
          </div>
        </div>

        {isEnabled && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Core Channel Toggles */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-graphite uppercase tracking-wider block">
                Channel Behaviors
              </label>

              {/* Public Comment Replies */}
              <div className="p-3 bg-fog/40 hover:bg-fog/70 rounded-xl border border-dove/15 transition-all flex items-center justify-between gap-3">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-ink">Public Comment Replies</p>
                  <p className="text-[10px] text-ash leading-tight mt-0.5">
                    AI replies directly under customer comments on Facebook/Instagram
                  </p>
                </div>
                <IosGreenSwitch
                  size="sm"
                  value={config.reply_as_comment}
                  onChange={v => setConfig(prev => ({ ...prev, reply_as_comment: v }))}
                />
              </div>

              {/* Private Messenger DM */}
              <div className="p-3 bg-fog/40 hover:bg-fog/70 rounded-xl border border-dove/15 transition-all flex items-center justify-between gap-3">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-ink">Private Messenger DM</p>
                  <p className="text-[10px] text-ash leading-tight mt-0.5">
                    Send a private Messenger DM whenever someone leaves a comment
                  </p>
                </div>
                <IosGreenSwitch
                  size="sm"
                  value={config.send_as_messenger}
                  onChange={v => setConfig(prev => ({ ...prev, send_as_messenger: v }))}
                />
              </div>

              {/* Auto-Delete Negative / Spam */}
              <div className="p-3 bg-fog/40 hover:bg-fog/70 rounded-xl border border-dove/15 transition-all flex items-center justify-between gap-3">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-ink">Auto-Delete Spam & Hate</p>
                  <p className="text-[10px] text-ash leading-tight mt-0.5">
                    Automatically remove abusive, competitor, or spam comments
                  </p>
                </div>
                <IosGreenSwitch
                  size="sm"
                  value={config.delete_negative}
                  onChange={v => setConfig(prev => ({ ...prev, delete_negative: v }))}
                />
              </div>
            </div>

            {/* Negative Comment Keywords */}
            {config.delete_negative && (
              <div className="p-3.5 bg-red-50/50 rounded-xl border border-red-200/80 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rust" />
                  <label className="text-[10px] font-bold text-rust uppercase tracking-wider">
                    Auto-Delete Trigger Phrases
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDeleteExample}
                    onChange={e => setNewDeleteExample(e.target.value)}
                    placeholder="e.g. fake, scam, fraud"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDeleteExample())}
                    className="flex-1 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-xs text-ink focus:outline-none focus:border-rust"
                  />
                  <button
                    type="button"
                    onClick={addDeleteExample}
                    className="px-3 py-1.5 bg-rust text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                  >
                    Add
                  </button>
                </div>

                {config.delete_examples?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {config.delete_examples.map((ex, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-rust border border-red-200 rounded-full text-[10px] font-medium shadow-xs">
                        {ex}
                        <button type="button" onClick={() => removeDeleteExample(i)} className="hover:text-red-900 font-bold ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Custom AI Instructions */}
            <div>
              <label className="text-[10px] font-bold text-graphite uppercase tracking-wider block mb-1.5">
                Post-Specific AI Instructions
              </label>
              <textarea
                rows={3}
                value={config.instructions || ''}
                onChange={e => setConfig(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="e.g. Highlight the 20% Eid discount, mention free delivery inside Dhaka, or emphasize that sizes 38-44 are in stock..."
                className="w-full px-3 py-2.5 bg-fog border border-dove/20 rounded-xl text-xs text-ink placeholder:text-ash/60 focus:outline-none focus:border-ink transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Attached Products */}
            {products.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-graphite uppercase tracking-wider">
                    Linked Products ({config.product_ids.length})
                  </label>
                  <span className="text-[10px] text-ash">AI uses for pricing/stock</span>
                </div>

                <div className="relative mb-2">
                  <Search className="w-3 h-3 text-ash absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Filter products..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-fog border border-dove/20 rounded-lg text-[11px] focus:outline-none focus:border-ink"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-fog/60 rounded-xl border border-dove/15">
                  {filteredProducts.map(p => {
                    const isSelected = config.product_ids.includes(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => toggleProduct(p.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                          isSelected
                            ? 'bg-ink text-white border-ink shadow-xs'
                            : 'bg-white text-graphite border-dove/20 hover:border-dove/40'
                        }`}
                      >
                        <Package className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{p.name}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-amber-300' : 'text-ash'}`}>
                          ৳{p.price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Save Button */}
      {isEnabled && (
        <div className="p-4 border-t border-dove/10 bg-white flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onToggleMaster(false)}
            disabled={isPending}
            className="text-[11px] font-semibold text-rust hover:text-red-700 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Disable
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 max-w-[180px] py-2.5 bg-ink text-white rounded-xl text-xs font-bold hover:bg-black disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-subtle cursor-pointer"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
            <span>Save Settings</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Center Column: Post Preview & Live Comments Stream ──────────────────────
function PostAndLiveCommentsCenter({
  post,
  automation,
  shopName,
}: {
  post: ConnectedPostItem;
  automation: PostAutomation | null;
  shopName: string;
}) {
  const [comments, setComments] = useState<CommentDetailItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'replied' | 'dmed' | 'moderated'>('all');

  const loadComments = async () => {
    setLoadingComments(true);
    const res = await fetchPostComments(post.post_id, post.platform);
    if (res.success) {
      setComments(res.comments || []);
    }
    setLoadingComments(false);
  };

  useEffect(() => {
    loadComments();
  }, [post.post_id]);

  const filteredComments = useMemo(() => {
    return comments.filter(c => {
      if (filterType === 'replied') return !!c.reply_text;
      if (filterType === 'dmed') return !!c.private_reply_sent;
      if (filterType === 'moderated') return !!c.is_deleted || !!c.is_negative;
      return true;
    });
  }, [comments, filterType]);

  const repliedCount = comments.filter(c => !!c.reply_text).length;
  const dmedCount = comments.filter(c => !!c.private_reply_sent).length;
  const moderatedCount = comments.filter(c => !!c.is_deleted || !!c.is_negative).length;

  return (
    <div className="h-full flex flex-col bg-fog/20 overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* ── Post Details Card ── */}
        <div className="bg-white rounded-2xl border border-dove/15 shadow-subtle overflow-hidden">
          {/* Post Header */}
          <div className="p-4 border-b border-dove/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs ${
                post.platform === 'instagram'
                  ? 'bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600'
                  : 'bg-[#0084FF]'
              }`}>
                <ChannelIcon channel={post.platform} className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-ink truncate">{shopName}</h4>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    post.platform === 'instagram'
                      ? 'bg-pink-50 text-pink-700 border-pink-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {post.platform}
                  </span>
                  {automation ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Automated ON
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-ash bg-fog border border-dove/20 px-2 py-0.5 rounded-full">
                      Automate OFF
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-ash mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(post.created_time).toLocaleDateString([], {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {post.permalink_url && (
              <a
                href={post.permalink_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl border border-dove/20 hover:border-dove/40 bg-fog/50 hover:bg-fog text-xs font-semibold text-graphite hover:text-ink flex items-center gap-1.5 transition-all shadow-xs shrink-0"
              >
                <span>View on {post.platform === 'instagram' ? 'Instagram' : 'Facebook'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Post Caption Body */}
          <div className="p-4 sm:p-5">
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap font-normal">
              {post.preview_text}
            </p>
          </div>

          {/* Post Media / Image */}
          {post.thumbnail_url && (
            <div className="px-4 sm:px-5 pb-5">
              <div className="max-h-[380px] w-full rounded-xl overflow-hidden bg-fog border border-dove/10 flex items-center justify-center">
                <img src={post.thumbnail_url} alt="Post visual" className="w-full h-full object-cover max-h-[380px]" />
              </div>
            </div>
          )}
        </div>

        {/* ── Live Comments & AI Replies Stream ── */}
        <div className="space-y-3">
          {/* Section Header & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-dove/15 shadow-subtle">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-ink" />
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Live Comments Stream</h3>
              <span className="px-2 py-0.5 rounded-full bg-fog text-ink text-[11px] font-bold border border-dove/15">
                {comments.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 bg-fog p-1 rounded-xl border border-dove/10">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    filterType === 'all' ? 'bg-white text-ink shadow-xs border border-dove/10' : 'text-ash hover:text-ink'
                  }`}
                >
                  All ({comments.length})
                </button>
                <button
                  onClick={() => setFilterType('replied')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    filterType === 'replied' ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200' : 'text-ash hover:text-emerald-700'
                  }`}
                >
                  AI Replied ({repliedCount})
                </button>
                <button
                  onClick={() => setFilterType('dmed')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    filterType === 'dmed' ? 'bg-white text-blue-700 shadow-xs border border-blue-200' : 'text-ash hover:text-blue-700'
                  }`}
                >
                  DMs Sent ({dmedCount})
                </button>
                <button
                  onClick={() => setFilterType('moderated')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    filterType === 'moderated' ? 'bg-white text-rust shadow-xs border border-red-200' : 'text-ash hover:text-rust'
                  }`}
                >
                  Moderated ({moderatedCount})
                </button>
              </div>

              <button
                onClick={loadComments}
                disabled={loadingComments}
                className="p-1.5 bg-white border border-dove/20 text-ash hover:text-ink rounded-lg transition-all shadow-xs"
                title="Refresh comments from Meta"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingComments ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Comments List */}
          {loadingComments ? (
            <div className="bg-white rounded-2xl border border-dove/15 p-8 text-center text-xs text-ash flex flex-col items-center justify-center gap-2 shadow-subtle">
              <Loader2 className="w-5 h-5 animate-spin text-ink" />
              <p className="font-semibold text-ink">Fetching latest comments & AI replies...</p>
            </div>
          ) : filteredComments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dove/15 p-8 text-center space-y-2 shadow-subtle">
              <MessageCircle className="w-8 h-8 text-ash mx-auto opacity-30" />
              <p className="text-xs font-bold text-ink">No comments in this filter</p>
              <p className="text-[11px] text-ash max-w-xs mx-auto">
                When customers leave comments on your published post, DullBot will automatically reply and record the activity here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredComments.map(comment => (
                <div
                  key={comment.id || comment.comment_id}
                  className={`p-4 bg-white rounded-2xl border transition-all ${
                    comment.is_deleted
                      ? 'border-red-200 bg-red-50/30 opacity-75'
                      : 'border-dove/15 hover:border-dove/30 shadow-subtle'
                  }`}
                >
                  {/* Customer Comment Bubble */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-dove/40 to-dove/70 text-ink flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      {comment.sender_name ? comment.sender_name[0].toUpperCase() : 'U'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink truncate">{comment.sender_name || 'Customer'}</span>
                          {comment.is_deleted && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                              Auto-Deleted
                            </span>
                          )}
                          {comment.private_reply_sent && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              DM Sent
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-ash">
                          {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-graphite mt-1 bg-fog/50 p-2.5 rounded-xl border border-dove/10 leading-relaxed whitespace-pre-wrap">
                        {comment.comment_text}
                      </p>

                      {/* AI Public Reply Bubble */}
                      {comment.reply_text && (
                        <div className="mt-2.5 pl-3 border-l-2 border-emerald-400">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 mb-1">
                            <Bot className="w-3.5 h-3.5 text-emerald-600" />
                            <span>DullBot AI • Public Reply</span>
                          </div>
                          <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-xs text-ink leading-relaxed">
                            {comment.reply_text}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Main SocialClient Component (3-Column Layout) ──────────────────────────
export default function SocialClient({
  initialAutomations,
  products,
}: {
  initialAutomations: PostAutomation[];
  products: Product[];
}) {
  const [automations, setAutomations] = useState<PostAutomation[]>(initialAutomations);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'facebook' | 'instagram'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'automated' | 'off'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Connected posts state
  const [connectedPosts, setConnectedPosts] = useState<ConnectedPostItem[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [shopName, setShopName] = useState<string>('My Store');
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [togglingPostId, setTogglingPostId] = useState<string | null>(null);

  const loadConnectedPosts = async () => {
    setLoadingPosts(true);
    setErrorMessage(null);
    const res = await fetchConnectedSocialPosts();
    setIsConnected(res.connected);
    if (res.shopName) setShopName(res.shopName);
    const posts = res.posts || [];
    setConnectedPosts(posts);

    // Auto-select first post if none selected
    if (posts.length > 0 && !selectedPostId) {
      setSelectedPostId(posts[0].post_id);
    }
    setLoadingPosts(false);
  };

  useEffect(() => {
    loadConnectedPosts();
  }, []);

  const automationMap = useMemo(() => {
    return new Map(automations.map(a => [a.post_id, a]));
  }, [automations]);

  // Master Toggle for post automation
  const handleToggleAutomation = async (post: ConnectedPostItem, targetEnabled: boolean) => {
    setTogglingPostId(post.post_id);
    setErrorMessage(null);
    const res = await togglePostAutomationStatus(post.post_id, targetEnabled, {
      platform: post.platform,
      preview_text: post.preview_text,
      thumbnail_url: post.thumbnail_url || undefined,
    });
    setTogglingPostId(null);

    if (res.success) {
      if (res.enabled && res.data) {
        setAutomations(prev => [res.data, ...prev.filter(x => x.post_id !== post.post_id)]);
      } else {
        setAutomations(prev => prev.filter(x => x.post_id !== post.post_id));
      }
    } else {
      setErrorMessage(res.error || 'Failed to toggle automation status.');
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const handleAdded = (a: PostAutomation) => {
    setAutomations(prev => [a, ...prev.filter(x => x.post_id !== a.post_id)]);
    setSelectedPostId(a.post_id);
    setShowAddModal(false);
  };

  const handleSaved = (postId: string, updated: PostAutomation) => {
    setAutomations(prev => prev.map(a => a.post_id === postId ? updated : a));
  };

  const handleDeleted = (postId: string) => {
    setAutomations(prev => prev.filter(a => a.post_id !== postId));
  };

  // Filtered & Sorted Feed for Left Column
  const filteredPosts = useMemo(() => {
    return connectedPosts
      .filter(p => {
        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesCaption = (p.preview_text || '').toLowerCase().includes(q);
          const matchesId = p.post_id.toLowerCase().includes(q);
          if (!matchesCaption && !matchesId) return false;
        }

        // Platform filter
        if (platformFilter === 'facebook' && p.platform !== 'facebook') return false;
        if (platformFilter === 'instagram' && p.platform !== 'instagram') return false;

        // Automation Status filter
        const isAuto = automationMap.has(p.post_id);
        if (statusFilter === 'automated' && !isAuto) return false;
        if (statusFilter === 'off' && isAuto) return false;

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_time).getTime();
        const timeB = new Date(b.created_time).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [connectedPosts, searchQuery, platformFilter, statusFilter, sortOrder, automationMap]);

  const selectedPost = useMemo(() => {
    return connectedPosts.find(p => p.post_id === selectedPostId) || filteredPosts[0] || null;
  }, [connectedPosts, filteredPosts, selectedPostId]);

  const selectedAutomation = useMemo(() => {
    return selectedPost ? automationMap.get(selectedPost.post_id) || null : null;
  }, [selectedPost, automationMap]);

  const fbCount = connectedPosts.filter(p => p.platform === 'facebook').length;
  const igCount = connectedPosts.filter(p => p.platform === 'instagram').length;
  const autoCount = automations.length;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-[#FAF9F5]">

      {/* Top Header Bar */}
      <header className="px-6 py-3.5 bg-white border-b border-dove/15 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-ink text-white flex items-center justify-center shadow-xs">
            <Bot className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h1 className="text-base font-bold text-ink leading-none">Social Comment Automation</h1>
            <p className="text-[11px] text-ash mt-0.5">Live AI comment replies, instant Messenger DMs, and intelligent spam auto-deletion</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-ink text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-subtle cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Paste Post URL</span>
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {errorMessage && (
        <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-rose-100 rounded-full">
            <X className="w-3.5 h-3.5 text-rose-600" />
          </button>
        </div>
      )}

      {/* ── 3-COLUMN WORKSPACE GRID ── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 w-full overflow-hidden">

        {/* ══════════════════════════════════════════════════════════
            COLUMN 1 (LEFT): POSTS LIST WITH SEARCH & FILTERS
            ══════════════════════════════════════════════════════════ */}
        <div className="w-full lg:w-[340px] xl:w-[360px] flex flex-col bg-white border-r border-dove/15 shrink-0 h-full">

          {/* Search & Sort Controls */}
          <div className="p-3.5 border-b border-dove/10 space-y-2.5 shrink-0 bg-fog/20">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ash absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search posts by caption or ID…"
                className="w-full pl-9 pr-3 py-2 bg-white border border-dove/20 rounded-xl text-xs text-ink placeholder:text-ash/60 focus:outline-none focus:border-ink shadow-xs transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ash hover:text-ink p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Platform Filter Pills */}
            <div className="flex items-center gap-1 bg-fog p-1 rounded-xl border border-dove/15">
              <button
                onClick={() => setPlatformFilter('all')}
                className={`flex-1 py-1 text-center rounded-lg text-[11px] font-bold transition-all ${
                  platformFilter === 'all' ? 'bg-white text-ink shadow-xs border border-dove/10' : 'text-ash hover:text-ink'
                }`}
              >
                All ({connectedPosts.length})
              </button>
              <button
                onClick={() => setPlatformFilter('facebook')}
                className={`flex-1 py-1 text-center rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                  platformFilter === 'facebook' ? 'bg-[#0084FF] text-white shadow-xs' : 'text-ash hover:text-[#0084FF]'
                }`}
              >
                <ChannelIcon channel="facebook" className="w-3 h-3" />
                FB ({fbCount})
              </button>
              <button
                onClick={() => setPlatformFilter('instagram')}
                className={`flex-1 py-1 text-center rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                  platformFilter === 'instagram' ? 'bg-pink-600 text-white shadow-xs' : 'text-ash hover:text-pink-600'
                }`}
              >
                <ChannelIcon channel="instagram" className="w-3 h-3" />
                IG ({igCount})
              </button>
            </div>

            {/* Secondary Filter & Sort Line */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setStatusFilter(prev => prev === 'all' ? 'automated' : prev === 'automated' ? 'off' : 'all')}
                  className="px-2 py-1 bg-white border border-dove/20 text-graphite rounded-lg text-[10px] font-bold hover:border-ink transition-all flex items-center gap-1 shadow-xs"
                >
                  <Filter className="w-3 h-3 text-ash" />
                  <span>{statusFilter === 'all' ? 'Status: All' : statusFilter === 'automated' ? 'Active ON' : 'Paused OFF'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="px-2 py-1 bg-white border border-dove/20 text-graphite rounded-lg text-[10px] font-bold hover:border-ink transition-all flex items-center gap-1 shadow-xs"
                >
                  {sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-rust" /> : <ArrowUp className="w-3 h-3 text-blue-600" />}
                  <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
                </button>

                <button
                  onClick={loadConnectedPosts}
                  disabled={loadingPosts}
                  className="p-1 bg-white border border-dove/20 text-ash hover:text-ink rounded-lg transition-all shadow-xs"
                  title="Refresh Posts"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingPosts ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Posts Feed Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingPosts ? (
              <div className="p-8 text-center space-y-2 text-xs text-ash">
                <Loader2 className="w-5 h-5 animate-spin text-ink mx-auto" />
                <p>Syncing published posts…</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-xs text-ash">
                <Megaphone className="w-6 h-6 text-ash mx-auto opacity-30" />
                <p className="font-bold text-ink">No matching posts</p>
                <p className="text-[11px] text-ash">Try changing your search term or platform filter.</p>
              </div>
            ) : (
              filteredPosts.map(post => {
                const isSelected = selectedPost?.post_id === post.post_id;
                const auto = automationMap.get(post.post_id);
                const isAuto = !!auto;

                return (
                  <button
                    key={post.post_id}
                    type="button"
                    onClick={() => setSelectedPostId(post.post_id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-ink text-white border-ink shadow-md scale-[1.01]'
                        : 'bg-white hover:bg-fog/60 border-dove/15 hover:border-dove/30 text-ink shadow-xs'
                    }`}
                  >
                    {/* Post Thumbnail */}
                    {post.thumbnail_url ? (
                      <img
                        src={post.thumbnail_url}
                        alt="Thumbnail"
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center border ${
                        isSelected ? 'bg-white/10 border-white/10' : 'bg-fog border-dove/15'
                      }`}>
                        <ImageIcon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-ash'}`} />
                      </div>
                    )}

                    {/* Post Excerpt & Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                          isSelected
                            ? 'bg-white/20 text-white border-white/20'
                            : post.platform === 'instagram'
                            ? 'bg-pink-50 text-pink-700 border-pink-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {post.platform}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isAuto ? (
                            <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'}`} title="Automation Active" />
                          ) : (
                            <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white/30' : 'bg-dove/40'}`} title="Automation Paused" />
                          )}
                          <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-ash'}`}>
                            {new Date(post.created_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <p className={`text-xs font-semibold line-clamp-2 leading-snug ${isSelected ? 'text-white' : 'text-ink'}`}>
                        {post.preview_text || '(No caption text)'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            COLUMN 2 (CENTER): POST PREVIEW & LIVE COMMENTS ACTIVITY
            ══════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {selectedPost ? (
            <PostAndLiveCommentsCenter
              post={selectedPost}
              automation={selectedAutomation}
              shopName={shopName}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-ash space-y-3">
              <Megaphone className="w-12 h-12 text-ash opacity-20" />
              <h3 className="text-sm font-bold text-ink">Select a Post to View</h3>
              <p className="text-xs max-w-sm">
                Choose any post from the left feed to inspect post details, monitor live customer comments, and fine-tune AI replies.
              </p>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════
            COLUMN 3 (RIGHT): AUTOMATION SETTINGS & AI TWEAKS
            ══════════════════════════════════════════════════════════ */}
        {selectedPost && (
          <div className="w-full lg:w-[360px] xl:w-[380px] shrink-0 h-full">
            <AutomationTweaksPanel
              post={selectedPost}
              automation={selectedAutomation}
              products={products}
              isToggling={togglingPostId === selectedPost.post_id}
              onToggleMaster={(val) => handleToggleAutomation(selectedPost, val)}
              onSaved={(updated) => handleSaved(selectedPost.post_id, updated)}
              onDeleted={() => handleDeleted(selectedPost.post_id)}
            />
          </div>
        )}

      </div>

      {/* Add Post URL Modal */}
      {showAddModal && (
        <AddPostModal
          connectedPosts={connectedPosts}
          isConnected={isConnected}
          onClose={() => setShowAddModal(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}

