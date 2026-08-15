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
  testPostCommentReply,
  sendManualCommentReply,
  generateAiCommentSuggestion,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-pure-white dark:bg-[#121214] rounded-2xl shadow-2xl border border-dove/20 dark:border-white/10 w-full max-w-lg p-6 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-ink">Add Post Automation</h3>
            <p className="text-xs text-ash">Select a published post or paste a direct post link.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-ash hover:text-ink rounded-lg hover:bg-fog dark:hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-dove/15 dark:border-white/10 shrink-0 gap-2">
          <button
            onClick={() => setTab('connected')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
              tab === 'connected' ? 'border-ink dark:border-white text-ink' : 'border-transparent text-ash hover:text-ink'
            }`}
          >
            Published Social Posts ({connectedPosts.length})
          </button>
          <button
            onClick={() => setTab('url')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
              tab === 'url' ? 'border-ink dark:border-white text-ink' : 'border-transparent text-ash hover:text-ink'
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
                <div key={p.post_id} className="flex items-center gap-3 p-3 bg-fog/60 dark:bg-white/[0.03] hover:bg-fog dark:hover:bg-white/[0.06] rounded-xl border border-dove/15 dark:border-white/10 transition-all">
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt="Post" className="w-12 h-12 object-cover rounded-lg shrink-0 border border-dove/15 dark:border-white/10" />
                  ) : (
                    <div className="w-12 h-12 bg-pure-white dark:bg-white/5 rounded-lg shrink-0 flex items-center justify-center border border-dove/15 dark:border-white/10">
                      <ImageIcon className="w-4 h-4 text-graphite dark:text-ash" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink line-clamp-2">{p.preview_text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                        p.platform === 'instagram'
                          ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
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
                    className="px-3 py-1.5 bg-ink text-pure-white dark:bg-white dark:text-black rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-all shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
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
              <label className="text-[10px] font-bold text-graphite dark:text-ash uppercase tracking-wider block mb-1.5">Platform</label>
              <div className="flex gap-2">
                {(['facebook', 'instagram'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer ${
                      platform === p
                        ? 'bg-ink text-pure-white dark:bg-white dark:text-black border-ink dark:border-white'
                        : 'bg-fog dark:bg-white/5 border-dove/20 dark:border-white/10 text-graphite dark:text-ash hover:border-dove/40'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-graphite dark:text-ash uppercase tracking-wider block mb-1.5">Post URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://www.facebook.com/photo?..."
                  className="flex-1 px-3 py-2 bg-fog dark:bg-[#18181c] border border-dove/20 dark:border-white/10 rounded-xl text-xs text-ink placeholder:text-ash/60 focus:outline-none focus:border-ink dark:focus:border-white/30 transition-all"
                />
                <button
                  onClick={handleFetch}
                  disabled={!url.trim() || fetching}
                  className="px-3 py-2 bg-ink text-pure-white dark:bg-white dark:text-black rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer"
                >
                  {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Fetch
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-rust font-medium">{error}</p>}

            {preview && (
              <div className="flex items-start gap-3 p-3 bg-fog dark:bg-white/[0.03] rounded-xl border border-dove/15 dark:border-white/10">
                {preview.post_thumbnail_url ? (
                  <img src={preview.post_thumbnail_url} alt="Post" className="w-12 h-12 object-cover rounded-lg shrink-0 border border-white/10" />
                ) : (
                  <div className="w-12 h-12 bg-pure-white dark:bg-white/5 rounded-lg shrink-0 border border-dove/15 dark:border-white/10" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink line-clamp-3">{preview.post_preview_text || '(no caption)'}</p>
                  <p className="text-[10px] text-graphite dark:text-ash font-mono mt-0.5">{preview.post_id}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-dove/10 dark:border-white/10">
              <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-ash hover:text-ink transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleAddManual}
                disabled={!preview || saving}
                className="px-4 py-2 bg-ink text-pure-white dark:bg-white dark:text-black rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
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
  onTestCommentAdded,
}: {
  post: ConnectedPostItem;
  automation: PostAutomation | null;
  products: Product[];
  isToggling: boolean;
  onToggleMaster: (enabled: boolean) => void;
  onSaved: (updated: PostAutomation) => void;
  onDeleted: () => void;
  onTestCommentAdded?: (comment: CommentDetailItem) => void;
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

  // Test AI Simulator State
  const [testCommentText, setTestCommentText] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simulatedResult, setSimulatedResult] = useState<string | null>(null);

  const handleSimulate = async () => {
    if (!testCommentText.trim() || simulating) return;
    setSimulating(true);
    setSimulatedResult(null);
    const res = await testPostCommentReply(post.post_id, testCommentText.trim(), 'Test Customer');
    if (res.success && res.comment) {
      setSimulatedResult(res.replyText || res.comment.reply_text || 'Reply generated');
      if (onTestCommentAdded) {
        onTestCommentAdded(res.comment);
      }
    } else if (res.error) {
      setSimulatedResult(`Error: ${res.error}`);
    }
    setSimulating(false);
  };

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
    <div className="h-full flex flex-col bg-pure-white dark:bg-[#0e0e11] border-l border-dove/15 dark:border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-dove/10 dark:border-white/10 flex items-center justify-between shrink-0 bg-fog/30 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-ink text-pure-white dark:bg-white/10 dark:text-white flex items-center justify-center shadow-xs">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink dark:text-white leading-none">Automation Settings</h3>
            <p className="text-[11px] text-ash mt-0.5">Rules & AI behaviors for this post</p>
          </div>
        </div>

        {saveToast && (
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in">
            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" /> Saved
          </span>
        )}
      </div>

      {/* Settings Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Master Switch Card */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isEnabled
            ? 'bg-emerald-500/10 border-emerald-500/30 shadow-subtle'
            : 'bg-fog/60 dark:bg-white/[0.03] border-dove/20 dark:border-white/10'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isEnabled ? 'bg-emerald-500 text-white shadow-xs' : 'bg-dove/30 dark:bg-white/10 text-graphite dark:text-ash'
              }`}>
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink dark:text-white">
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
              <label className="text-[10px] font-bold text-graphite dark:text-ash uppercase tracking-wider block">
                Channel Behaviors
              </label>

              {/* Public Comment Replies */}
              <div className="p-3 bg-fog/40 hover:bg-fog/70 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] rounded-xl border border-dove/15 dark:border-white/10 transition-all flex items-center justify-between gap-3">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-ink dark:text-white">Public Comment Replies</p>
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
              <div className="p-3 bg-fog/40 hover:bg-fog/70 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] rounded-xl border border-dove/15 dark:border-white/10 transition-all flex items-center justify-between gap-3">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-ink dark:text-white">Private Messenger DM</p>
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
              <div className="p-3 bg-fog/40 hover:bg-fog/70 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] rounded-xl border border-dove/15 dark:border-white/10 transition-all flex items-center justify-between gap-3">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-ink dark:text-white">Auto-Delete Spam & Hate</p>
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
              <div className="p-3.5 bg-rose-500/5 dark:bg-rose-500/10 rounded-xl border border-rose-500/20 space-y-2.5">
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
                    className="flex-1 px-3 py-1.5 bg-pure-white dark:bg-[#18181c] border border-rose-500/30 rounded-lg text-xs text-ink dark:text-white focus:outline-none focus:border-rust"
                  />
                  <button
                    type="button"
                    onClick={addDeleteExample}
                    className="px-3 py-1.5 bg-rust text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {config.delete_examples?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {config.delete_examples.map((ex, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-pure-white dark:bg-[#18181c] text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full text-[10px] font-medium shadow-xs">
                        {ex}
                        <button type="button" onClick={() => removeDeleteExample(i)} className="hover:text-red-900 dark:hover:text-red-300 font-bold ml-0.5 cursor-pointer">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Custom AI Instructions */}
            <div>
              <label className="text-[10px] font-bold text-graphite dark:text-ash uppercase tracking-wider block mb-1.5">
                Post-Specific AI Instructions
              </label>
              <textarea
                rows={3}
                value={config.instructions || ''}
                onChange={e => setConfig(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="e.g. Highlight the 20% Eid discount, mention free delivery inside Dhaka, or emphasize that sizes 38-44 are in stock..."
                className="w-full px-3 py-2.5 bg-fog dark:bg-[#16161a] border border-dove/20 dark:border-white/10 rounded-xl text-xs text-ink dark:text-white placeholder:text-ash/60 focus:outline-none focus:border-ink dark:focus:border-white/30 transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Attached Products */}
            {products.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-graphite dark:text-ash uppercase tracking-wider">
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
                    className="w-full pl-8 pr-2.5 py-1.5 bg-fog dark:bg-[#16161a] border border-dove/20 dark:border-white/10 rounded-lg text-[11px] text-ink dark:text-white focus:outline-none focus:border-ink dark:focus:border-white/30"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-fog/60 dark:bg-white/[0.03] rounded-xl border border-dove/15 dark:border-white/10">
                  {filteredProducts.map(p => {
                    const isSelected = config.product_ids.includes(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => toggleProduct(p.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-ink text-pure-white dark:bg-white dark:text-black border-ink dark:border-white shadow-xs'
                            : 'bg-pure-white dark:bg-[#18181c] text-graphite dark:text-ash border-dove/20 dark:border-white/10 hover:border-dove/40'
                        }`}
                      >
                        <Package className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{p.name}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-amber-300 dark:text-amber-600' : 'text-ash'}`}>
                          ৳{p.price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Test AI Reply Simulator Console (Moved to Right Sidebar) ── */}
            <div className="p-3.5 bg-fog/70 dark:bg-white/[0.03] rounded-2xl border border-dove/20 dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <label className="text-[10px] font-bold text-graphite dark:text-ash uppercase tracking-wider">
                    Test AI Response
                  </label>
                </div>
                <span className="text-[9px] text-ash">Simulate live reply</span>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={testCommentText}
                  onChange={e => setTestCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSimulate())}
                  placeholder='e.g. "pp please", "delivery charge koto?"'
                  className="w-full px-3 py-2 bg-pure-white dark:bg-[#16161a] border border-dove/20 dark:border-white/10 rounded-xl text-xs text-ink dark:text-white placeholder:text-ash/60 focus:outline-none focus:border-ink dark:focus:border-white/30"
                />

                <button
                  type="button"
                  onClick={handleSimulate}
                  disabled={simulating || !testCommentText.trim()}
                  className="w-full py-2 px-3 bg-ink text-pure-white dark:bg-white dark:text-black rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {simulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Simulate AI Reply</span>
                </button>
              </div>

              {simulatedResult && (
                <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs text-ink dark:text-white space-y-1 animate-in fade-in">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Bot className="w-3 h-3" />
                    <span>Simulated DullBot Output:</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{simulatedResult}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Save Button */}
      {isEnabled && (
        <div className="p-4 border-t border-dove/10 dark:border-white/10 bg-pure-white dark:bg-[#0e0e11] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onToggleMaster(false)}
            disabled={isPending}
            className="text-[11px] font-semibold text-rust hover:text-red-700 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Disable
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 max-w-[180px] py-2.5 bg-ink text-pure-white dark:bg-white dark:text-black rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 shadow-subtle cursor-pointer"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
            <span>Save Settings</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Individual Comment Row Item (Instagram Design Language) ────────────────
function CommentRowItem({
  comment,
  postId,
  platform,
  onReplySuccess,
}: {
  comment: CommentDetailItem;
  postId: string;
  platform: 'facebook' | 'instagram';
  onReplySuccess: (commentId: string, replyText: string, asDm: boolean) => void;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAsDm, setReplyAsDm] = useState(false);
  const [sending, setSending] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAiSuggest = async () => {
    setGeneratingAi(true);
    setError(null);
    const res = await generateAiCommentSuggestion(postId, comment.comment_text, comment.sender_name || 'Customer');
    if (res.success && res.suggestion) {
      setReplyText(res.suggestion);
    } else if (res.error) {
      setError(res.error);
    }
    setGeneratingAi(false);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    setError(null);
    const res = await sendManualCommentReply(postId, comment.comment_id, replyText.trim(), platform, replyAsDm);
    if (res.success) {
      onReplySuccess(comment.comment_id, replyText.trim(), replyAsDm);
      setIsReplying(false);
      setReplyText('');
    } else {
      setError(res.error || 'Failed to send reply');
    }
    setSending(false);
  };

  const initial = comment.sender_name ? comment.sender_name[0].toUpperCase() : 'U';

  return (
    <div className={`p-4 transition-colors ${comment.is_deleted ? 'bg-rose-500/5 opacity-70' : 'hover:bg-fog/30 dark:hover:bg-white/[0.02]'}`}>
      <div className="flex items-start gap-3">
        {/* Instagram Circular Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-dove/30 to-dove/60 dark:from-white/10 dark:to-white/20 text-ink dark:text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border border-dove/10 dark:border-white/10">
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          {/* Instagram Inline Name + Text */}
          <div className="text-xs text-ink dark:text-[#f4f4f5] leading-relaxed">
            <span className="font-bold mr-1.5 text-ink dark:text-white hover:underline cursor-pointer">
              {comment.sender_name || 'Customer'}
            </span>
            <span className="font-normal text-graphite dark:text-[#d4d4d8] whitespace-pre-wrap">
              {comment.comment_text}
            </span>
          </div>

          {/* Micro Meta Row */}
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-ash flex-wrap">
            <span>
              {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>

            {comment.is_deleted && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                Auto-Deleted
              </span>
            )}
            {comment.private_reply_sent && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                DM Sent
              </span>
            )}
            {comment.reply_text && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Replied
              </span>
            )}

            {!comment.is_deleted && (
              <>
                <button
                  type="button"
                  onClick={() => setIsReplying(prev => !prev)}
                  className="font-bold text-ash hover:text-ink dark:hover:text-white transition-colors cursor-pointer"
                >
                  {isReplying ? 'Cancel' : 'Reply'}
                </button>

                {!comment.reply_text && !isReplying && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplying(true);
                      handleAiSuggest();
                    }}
                    className="font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>AI Suggest</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Threaded Bot Reply (Indented Instagram Child Reply) */}
          {comment.reply_text && (
            <div className="mt-3 pl-3.5 border-l-2 border-emerald-500/40 space-y-1">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-ink dark:text-[#f4f4f5] leading-relaxed">
                    <span className="font-bold mr-1.5 text-emerald-700 dark:text-emerald-400">
                      DullBot
                    </span>
                    <span className="text-graphite dark:text-[#d4d4d8] whitespace-pre-wrap">
                      {comment.reply_text}
                    </span>
                  </div>
                  <p className="text-[10px] text-ash mt-0.5">Automated comment reply</p>
                </div>
              </div>
            </div>
          )}

          {/* Inline Reply Composer */}
          {isReplying && (
            <div className="mt-3 p-3 bg-fog/70 dark:bg-white/[0.03] rounded-2xl border border-dove/20 dark:border-white/10 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-ash uppercase tracking-wider">
                  Replying as {platform === 'instagram' ? 'Instagram' : 'Facebook Page'}
                </span>

                <div className="flex items-center gap-1 bg-pure-white dark:bg-[#18181c] p-0.5 rounded-lg border border-dove/15 dark:border-white/10 text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setReplyAsDm(false)}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      !replyAsDm ? 'bg-ink text-pure-white dark:bg-white dark:text-black shadow-xs' : 'text-ash hover:text-ink'
                    }`}
                  >
                    Public Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyAsDm(true)}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      replyAsDm ? 'bg-ink text-pure-white dark:bg-white dark:text-black shadow-xs' : 'text-ash hover:text-ink'
                    }`}
                  >
                    Private DM
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder={replyAsDm ? `Send private DM to ${comment.sender_name}...` : `Reply to @${comment.sender_name || 'customer'}...`}
                  rows={2}
                  className="w-full px-3 py-2 bg-pure-white dark:bg-[#18181c] border border-dove/20 dark:border-white/10 rounded-xl text-xs text-ink dark:text-white placeholder:text-ash/60 focus:outline-none focus:border-ink dark:focus:border-white/30 resize-none leading-relaxed"
                />
              </div>

              {error && <p className="text-[11px] font-medium text-rust">{error}</p>}

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleAiSuggest}
                  disabled={generatingAi}
                  className="px-2.5 py-1.5 bg-pure-white dark:bg-white/5 hover:bg-fog dark:hover:bg-white/10 border border-dove/20 dark:border-white/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                >
                  {generatingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span>AI Suggest</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReplying(false)}
                    className="px-3 py-1.5 text-[11px] font-semibold text-ash hover:text-ink transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={sending || !replyText.trim()}
                    className="px-3.5 py-1.5 bg-ink text-pure-white dark:bg-white dark:text-black rounded-lg text-[11px] font-bold hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Post {replyAsDm ? 'DM' : 'Reply'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Center Column: Post Preview & Live Comments (Instagram Style Canvas) ────
function PostAndLiveCommentsCenter({
  post,
  automation,
  shopName,
  newSimulatedComment,
}: {
  post: ConnectedPostItem;
  automation: PostAutomation | null;
  shopName: string;
  newSimulatedComment?: CommentDetailItem | null;
}) {
  const [comments, setComments] = useState<CommentDetailItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'replied' | 'dmed' | 'moderated'>('all');

  const handleReplySuccess = (commentId: string, replyText: string, asDm: boolean) => {
    setComments(prev =>
      prev.map(c => {
        if (c.comment_id === commentId || c.id === commentId) {
          return {
            ...c,
            reply_text: asDm ? c.reply_text : replyText,
            private_reply_sent: asDm ? true : c.private_reply_sent,
            replied_at: new Date().toISOString(),
          };
        }
        return c;
      })
    );
  };

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

  useEffect(() => {
    if (newSimulatedComment) {
      setComments(prev => [newSimulatedComment, ...prev.filter(c => c.id !== newSimulatedComment.id)]);
    }
  }, [newSimulatedComment]);

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
    <div className="h-full flex flex-col bg-fog/40 dark:bg-[#09090b] overflow-y-auto p-4 sm:p-6">
      <div className="max-w-2xl w-full mx-auto space-y-4">

        {/* ── Cohesive Instagram Post & Discussion Card ── */}
        <div className="bg-pure-white dark:bg-[#121214] rounded-3xl border border-dove/15 dark:border-white/10 shadow-subtle overflow-hidden">

          {/* Instagram Post Header */}
          <div className="p-4 border-b border-dove/10 dark:border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Story Ring Avatar */}
              <div className={`w-10 h-10 rounded-full p-[2px] shrink-0 shadow-xs ${
                post.platform === 'instagram'
                  ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600'
                  : 'bg-gradient-to-tr from-blue-500 to-blue-600'
              }`}>
                <div className="w-full h-full rounded-full bg-pure-white dark:bg-[#121214] flex items-center justify-center overflow-hidden">
                  <div className={`w-full h-full flex items-center justify-center text-white ${
                    post.platform === 'instagram'
                      ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600'
                      : 'bg-[#0084FF]'
                  }`}>
                    <ChannelIcon channel={post.platform} className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-ink dark:text-white truncate">{shopName}</h4>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    post.platform === 'instagram'
                      ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                  }`}>
                    {post.platform}
                  </span>
                  {automation ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Automated ON
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-ash bg-fog dark:bg-white/5 border border-dove/20 dark:border-white/10 px-2 py-0.5 rounded-full">
                      Paused
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
                className="px-3 py-1.5 rounded-xl border border-dove/20 dark:border-white/10 hover:border-dove/40 dark:hover:border-white/20 bg-fog/50 dark:bg-white/5 hover:bg-fog dark:hover:bg-white/10 text-xs font-semibold text-graphite dark:text-ash hover:text-ink dark:hover:text-white flex items-center gap-1.5 transition-all shadow-xs shrink-0"
              >
                <span>View on {post.platform === 'instagram' ? 'Instagram' : 'Facebook'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Post Media Container (if available) */}
          {post.thumbnail_url && (
            <div className="bg-black/5 dark:bg-black/40 border-b border-dove/10 dark:border-white/10 max-h-[380px] w-full flex items-center justify-center overflow-hidden">
              <img src={post.thumbnail_url} alt="Post visual" className="w-full h-full object-cover max-h-[380px]" />
            </div>
          )}

          {/* Post Caption (Instagram Style) */}
          <div className="p-4 border-b border-dove/10 dark:border-white/10">
            <p className="text-xs text-ink dark:text-[#f4f4f5] leading-relaxed whitespace-pre-wrap">
              <span className="font-bold mr-1.5 text-ink dark:text-white">{shopName}</span>
              {post.preview_text || '(No caption text)'}
            </p>
          </div>

          {/* ── Seamless Instagram Comments Header & Tab Bar ── */}
          <div className="p-3.5 bg-fog/30 dark:bg-white/[0.02] border-b border-dove/10 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-ink dark:text-white" />
              <h3 className="text-xs font-bold text-ink dark:text-white uppercase tracking-wider">Comments Stream</h3>
              <span className="px-2 py-0.5 rounded-full bg-pure-white dark:bg-white/10 text-ink dark:text-white text-[11px] font-bold border border-dove/15 dark:border-white/10 shadow-xs">
                {comments.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 bg-pure-white dark:bg-[#18181c] p-0.5 rounded-xl border border-dove/15 dark:border-white/10 shadow-xs">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    filterType === 'all' ? 'bg-ink text-pure-white dark:bg-white dark:text-black shadow-xs' : 'text-ash hover:text-ink dark:hover:text-white'
                  }`}
                >
                  All ({comments.length})
                </button>
                <button
                  onClick={() => setFilterType('replied')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    filterType === 'replied' ? 'bg-emerald-500 text-white shadow-xs' : 'text-ash hover:text-emerald-600'
                  }`}
                >
                  Replied ({repliedCount})
                </button>
                <button
                  onClick={() => setFilterType('dmed')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    filterType === 'dmed' ? 'bg-blue-500 text-white shadow-xs' : 'text-ash hover:text-blue-600'
                  }`}
                >
                  DMs ({dmedCount})
                </button>
                <button
                  onClick={() => setFilterType('moderated')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    filterType === 'moderated' ? 'bg-rose-500 text-white shadow-xs' : 'text-ash hover:text-rose-600'
                  }`}
                >
                  Spam ({moderatedCount})
                </button>
              </div>

              <button
                onClick={loadComments}
                disabled={loadingComments}
                className="p-1.5 bg-pure-white dark:bg-[#18181c] border border-dove/20 dark:border-white/10 text-ash hover:text-ink dark:hover:text-white rounded-xl transition-all shadow-xs cursor-pointer"
                title="Refresh comments"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingComments ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Comments Feed */}
          {loadingComments ? (
            <div className="p-8 text-center text-xs text-ash flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-ink dark:text-white" />
              <p className="font-semibold text-ink dark:text-white">Fetching live comments...</p>
            </div>
          ) : filteredComments.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <MessageCircle className="w-8 h-8 text-ash mx-auto opacity-30" />
              <p className="text-xs font-bold text-ink dark:text-white">No comments in this filter</p>
              <p className="text-[11px] text-ash max-w-xs mx-auto">
                When customers comment on this post, DullBot will answer automatically and stream conversations here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-dove/10 dark:divide-white/5">
              {filteredComments.map(comment => (
                <CommentRowItem
                  key={comment.id || comment.comment_id}
                  comment={comment}
                  postId={post.post_id}
                  platform={post.platform}
                  onReplySuccess={handleReplySuccess}
                />
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
  const [simulatedComment, setSimulatedComment] = useState<CommentDetailItem | null>(null);

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

    if (res.success) {
      if (targetEnabled && res.data) {
        setAutomations(prev => {
          const filtered = prev.filter(a => a.post_id !== post.post_id);
          return [res.data!, ...filtered];
        });
      } else {
        setAutomations(prev => prev.filter(a => a.post_id !== post.post_id));
      }
    } else {
      setErrorMessage(res.error || 'Failed to toggle automation');
    }
    setTogglingPostId(null);
  };

  const handleAdded = (newAuto: PostAutomation) => {
    setAutomations(prev => [newAuto, ...prev]);
    setSelectedPostId(newAuto.post_id);
    setShowAddModal(false);
  };

  const handleSaved = (postId: string, updated: PostAutomation) => {
    setAutomations(prev => prev.map(a => a.post_id === postId ? updated : a));
  };

  const handleDeleted = (postId: string) => {
    setAutomations(prev => prev.filter(a => a.post_id !== postId));
  };

  // Filtered post feed
  const filteredPosts = useMemo(() => {
    return connectedPosts
      .filter(p => {
        if (platformFilter === 'facebook') return p.platform === 'facebook';
        if (platformFilter === 'instagram') return p.platform === 'instagram';
        return true;
      })
      .filter(p => {
        if (statusFilter === 'automated') return automationMap.has(p.post_id);
        if (statusFilter === 'off') return !automationMap.has(p.post_id);
        return true;
      })
      .filter(p => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          p.preview_text.toLowerCase().includes(q) ||
          p.post_id.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_time).getTime();
        const timeB = new Date(b.created_time).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [connectedPosts, platformFilter, statusFilter, searchQuery, sortOrder, automationMap]);

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
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-fog dark:bg-[#09090b]">

      {/* Top Header Bar */}
      <header className="px-6 py-3 bg-pure-white dark:bg-[#0e0e11] border-b border-dove/15 dark:border-white/10 flex items-center justify-between shrink-0 shadow-xs z-10">
        <h1 className="text-sm font-bold text-ink dark:text-white">Social Comment Automation</h1>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-ink text-pure-white dark:bg-white dark:text-black rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-subtle cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Paste Post URL</span>
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {errorMessage && (
        <div className="px-6 py-2.5 bg-rose-50 dark:bg-rose-500/10 border-b border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-full cursor-pointer">
            <X className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          </button>
        </div>
      )}

      {/* ── 3-COLUMN WORKSPACE GRID ── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 w-full overflow-hidden">

        {/* ══════════════════════════════════════════════════════════
            COLUMN 1 (LEFT): POSTS LIST WITH SEARCH & FILTERS
            ══════════════════════════════════════════════════════════ */}
        <div className="w-full lg:w-[340px] xl:w-[360px] flex flex-col bg-pure-white dark:bg-[#0e0e11] border-r border-dove/15 dark:border-white/10 shrink-0 h-full">

          {/* Search & Sort Controls */}
          <div className="p-3.5 border-b border-dove/10 dark:border-white/10 space-y-2.5 shrink-0 bg-fog/20 dark:bg-white/[0.02]">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ash absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search posts by caption or ID…"
                className="w-full pl-9 pr-3 py-2 bg-pure-white dark:bg-[#16161a] border border-dove/20 dark:border-white/10 rounded-xl text-xs text-ink dark:text-white placeholder:text-ash/60 focus:outline-none focus:border-ink dark:focus:border-white/30 shadow-xs transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ash hover:text-ink dark:hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Platform Filter Pills */}
            <div className="flex items-center gap-1 bg-fog dark:bg-white/5 p-1 rounded-xl border border-dove/15 dark:border-white/10">
              <button
                onClick={() => setPlatformFilter('all')}
                className={`flex-1 py-1 text-center rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  platformFilter === 'all' ? 'bg-pure-white dark:bg-white/15 text-ink dark:text-white shadow-xs border border-dove/10 dark:border-white/10' : 'text-ash hover:text-ink dark:hover:text-white'
                }`}
              >
                All ({connectedPosts.length})
              </button>
              <button
                onClick={() => setPlatformFilter('facebook')}
                className={`flex-1 py-1 text-center rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  platformFilter === 'facebook' ? 'bg-[#0084FF] text-white shadow-xs' : 'text-ash hover:text-[#0084FF]'
                }`}
              >
                <ChannelIcon channel="facebook" className="w-3 h-3" />
                FB ({fbCount})
              </button>
              <button
                onClick={() => setPlatformFilter('instagram')}
                className={`flex-1 py-1 text-center rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
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
                  className="px-2 py-1 bg-pure-white dark:bg-white/5 border border-dove/20 dark:border-white/10 text-graphite dark:text-ash rounded-lg text-[10px] font-bold hover:border-ink dark:hover:border-white/30 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Filter className="w-3 h-3 text-ash" />
                  <span>{statusFilter === 'all' ? 'Status: All' : statusFilter === 'automated' ? 'Active ON' : 'Paused OFF'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="px-2 py-1 bg-pure-white dark:bg-white/5 border border-dove/20 dark:border-white/10 text-graphite dark:text-ash rounded-lg text-[10px] font-bold hover:border-ink dark:hover:border-white/30 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  {sortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-rust" /> : <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                  <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
                </button>

                <button
                  onClick={loadConnectedPosts}
                  disabled={loadingPosts}
                  className="p-1 bg-pure-white dark:bg-white/5 border border-dove/20 dark:border-white/10 text-ash hover:text-ink dark:hover:text-white rounded-lg transition-all shadow-xs cursor-pointer"
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
                <Loader2 className="w-5 h-5 animate-spin text-ink dark:text-white mx-auto" />
                <p>Syncing published posts…</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-xs text-ash">
                <Megaphone className="w-6 h-6 text-ash mx-auto opacity-30" />
                <p className="font-bold text-ink dark:text-white">No matching posts</p>
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
                        ? 'bg-zinc-900 text-white dark:bg-white/10 dark:text-white border-zinc-900 dark:border-white/20 shadow-md ring-1 ring-black/5 dark:ring-white/10 scale-[1.01]'
                        : 'bg-pure-white dark:bg-[#121214] hover:bg-fog/60 dark:hover:bg-[#18181c] border-dove/15 dark:border-white/10 text-ink dark:text-white shadow-xs'
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
                        isSelected ? 'bg-white/10 border-white/10' : 'bg-fog dark:bg-white/5 border-dove/15 dark:border-white/10'
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
                            ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
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

                      <p className={`text-xs font-semibold line-clamp-2 leading-snug ${isSelected ? 'text-white' : 'text-ink dark:text-[#e4e4e7]'}`}>
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
              newSimulatedComment={simulatedComment}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-ash space-y-3">
              <Megaphone className="w-12 h-12 text-ash opacity-20" />
              <h3 className="text-sm font-bold text-ink dark:text-white">Select a Post to View</h3>
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
              onTestCommentAdded={setSimulatedComment}
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
