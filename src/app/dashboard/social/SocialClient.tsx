'use client';

import { useState, useTransition } from 'react';
import {
  MessageSquare, Send, Trash2, Package, Plus, ExternalLink,
  ToggleLeft, ToggleRight, ChevronRight, ChevronDown, Loader2,
  X, Settings, AlertTriangle, CheckCircle2, Megaphone, RefreshCw,
  Eye, Image as ImageIcon
} from 'lucide-react';
import {
  upsertPostAutomation,
  deletePostAutomation,
  fetchPostPreview,
  getCommentStats,
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

// ─── Toggle Switch ──────────────────────────────────────────────────────────
function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
        value ? 'bg-ink' : 'bg-dove/40'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
    </button>
  );
}

// ─── Per-post config panel ──────────────────────────────────────────────────
function PostConfigPanel({
  automation,
  products,
  onSaved,
  onDeleted,
}: {
  automation: PostAutomation;
  products: Product[];
  onSaved: (updated: PostAutomation) => void;
  onDeleted: () => void;
}) {
  const [config, setConfig] = useState<PostAutomation>({ ...automation });
  const [newDeleteExample, setNewDeleteExample] = useState('');
  const [isPending, startTransition] = useTransition();
  const [stats, setStats] = useState<CommentStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');

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
        post_id: config.post_id,
        post_platform: config.post_platform,
        post_preview_text: config.post_preview_text || undefined,
        post_thumbnail_url: config.post_thumbnail_url || undefined,
        reply_as_comment: config.reply_as_comment,
        instructions: config.instructions || undefined,
        delete_negative: config.delete_negative,
        delete_examples: config.delete_examples,
        send_as_messenger: config.send_as_messenger,
        product_ids: config.product_ids,
      });
      if (result.success) {
        setSaveState('saved');
        onSaved(config);
        setTimeout(() => setSaveState('idle'), 2000);
      } else {
        setSaveState('error');
        setTimeout(() => setSaveState('idle'), 3000);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm('Remove automation for this post?')) return;
    startTransition(async () => {
      await deletePostAutomation(config.post_id);
      onDeleted();
    });
  };

  const loadStats = async () => {
    setLoadingStats(true);
    const s = await getCommentStats(config.post_id);
    setStats(s);
    setLoadingStats(false);
  };

  return (
    <div className="space-y-5">
      {/* Post header */}
      <div className="flex items-start gap-3 p-3 bg-fog rounded-cards border border-dove/10">
        {config.post_thumbnail_url ? (
          <img src={config.post_thumbnail_url} alt="Post" className="w-14 h-14 object-cover rounded-inputs shrink-0" />
        ) : (
          <div className="w-14 h-14 bg-dove/20 rounded-inputs shrink-0 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-graphite" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-ink leading-snug line-clamp-2">
            {config.post_preview_text || 'Post preview not available'}
          </p>
          <p className="text-[10px] text-graphite mt-1 font-mono">{config.post_id}</p>
          <span className={`inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
            config.post_platform === 'instagram'
              ? 'bg-pink-50 text-pink-700 border-pink-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            {config.post_platform}
          </span>
        </div>
        <a
          href={`https://www.facebook.com/${config.post_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 text-graphite hover:text-ink rounded hover:bg-fog transition-colors shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Comment stats */}
      <div className="flex items-center gap-2">
        <button
          onClick={loadStats}
          disabled={loadingStats}
          className="flex items-center gap-1.5 text-[10px] text-graphite hover:text-ink transition-colors"
        >
          {loadingStats ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
          Load stats
        </button>
        {stats && (
          <div className="flex items-center gap-3 text-[10px] text-graphite">
            <span><strong className="text-ink">{stats.total}</strong> comments</span>
            <span><strong className="text-ink">{stats.replied}</strong> replied</span>
            <span><strong className="text-ink">{stats.privateReplied}</strong> private</span>
            <span><strong className="text-ink">{stats.deleted}</strong> deleted</span>
          </div>
        )}
      </div>

      {/* 1. Reply as Comment */}
      <div className="flex items-start justify-between gap-4 py-3 border-b border-dove/10">
        <div>
          <p className="text-sm font-semibold text-ink flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-graphite" /> Reply as Comment
          </p>
          <p className="text-xs text-ash mt-0.5">AI replies publicly to comments on this post with intent-aware responses</p>
        </div>
        <Toggle value={config.reply_as_comment} onChange={v => setConfig(c => ({ ...c, reply_as_comment: v }))} />
      </div>

      {/* 2. Instructions */}
      {config.reply_as_comment && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-graphite uppercase tracking-wider block">Reply instructions</label>
          <textarea
            rows={4}
            value={config.instructions || ''}
            onChange={e => setConfig(c => ({ ...c, instructions: e.target.value }))}
            placeholder={`Describe how to reply. Include example intent pairs:\n"Pp" → price inquiry (send the price)\n"Interested" → send product link\n"Koto porbe" → price inquiry in Bangla`}
            className="w-full px-3 py-2 bg-fog border border-dove/20 rounded-inputs text-xs text-ink focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-all resize-none leading-relaxed"
          />
          <p className="text-[10px] text-ash">The AI treats these as illustrative examples of intent categories — misspellings and variants will still match.</p>
        </div>
      )}

      {/* 3. Delete negative comments */}
      <div className="space-y-3 py-3 border-b border-dove/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-graphite" /> Delete negative comments
            </p>
            <p className="text-xs text-ash mt-0.5">
              AI deletes only when confidence ≥ 85%. Ambiguous comments are always left alone.
              Requires <code className="bg-fog px-1 rounded text-[10px]">pages_manage_engagement</code> permission.
            </p>
          </div>
          <Toggle value={config.delete_negative} onChange={v => setConfig(c => ({ ...c, delete_negative: v }))} />
        </div>

        {config.delete_negative && (
          <div className="space-y-2 pl-2">
            <label className="text-[10px] font-bold text-graphite uppercase tracking-wider block">
              Example comments to delete
            </label>
            <div className="flex flex-col gap-1.5">
              {(config.delete_examples || []).map((ex, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-apricot-wash rounded-inputs border border-rust/10 text-xs">
                  <span className="flex-1 text-ink">{ex}</span>
                  <button onClick={() => removeDeleteExample(i)} className="text-rust hover:text-red-800">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDeleteExample}
                onChange={e => setNewDeleteExample(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDeleteExample())}
                placeholder="Add example comment to delete..."
                className="flex-1 px-3 py-1.5 bg-fog border border-dove/20 rounded-inputs text-xs focus:outline-none focus:border-ink transition-all"
              />
              <button
                onClick={addDeleteExample}
                className="px-3 py-1.5 bg-ink text-white rounded-inputs text-xs font-semibold hover:bg-black transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Send as Messenger */}
      <div className="flex items-start justify-between gap-4 py-3 border-b border-dove/10">
        <div>
          <p className="text-sm font-semibold text-ink flex items-center gap-2">
            <Send className="w-4 h-4 text-graphite" /> Send as Messenger
          </p>
          <p className="text-xs text-ash mt-0.5">
            Sends a private reply to the commenter via Messenger DM (one-shot per comment, within 7 days of the comment).
            The conversation then appears in your Live Inbox.
          </p>
        </div>
        <Toggle value={config.send_as_messenger} onChange={v => setConfig(c => ({ ...c, send_as_messenger: v }))} />
      </div>

      {/* 5. Products */}
      <div className="space-y-2 py-3 border-b border-dove/10">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-graphite" />
          <p className="text-sm font-semibold text-ink">Attached products <span className="text-graphite font-normal text-xs">(optional)</span></p>
        </div>
        <p className="text-xs text-ash">AI will reference these products by name and price when generating replies.</p>
        {products.length === 0 ? (
          <p className="text-xs text-ash italic">No products in your catalog.</p>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto">
            {products.map(p => {
              const selected = config.product_ids.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-inputs border text-left transition-all text-xs ${
                    selected
                      ? 'bg-ink/5 border-ink/20 text-ink'
                      : 'bg-fog border-dove/15 text-graphite hover:border-dove/30'
                  }`}
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-6 h-6 object-cover rounded shrink-0" />
                  ) : (
                    <div className="w-6 h-6 bg-dove/20 rounded shrink-0" />
                  )}
                  <span className="flex-1 truncate font-medium">{p.name}</span>
                  <span className="text-[10px] font-mono text-graphite shrink-0">৳{p.price.toLocaleString()}</span>
                  {selected && <CheckCircle2 className="w-3.5 h-3.5 text-ink shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Save / Delete */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs text-rust hover:underline disabled:opacity-40"
        >
          Remove automation
        </button>
        <button
          onClick={handleSave}
          disabled={isPending}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-buttons text-xs font-semibold transition-all shadow-subtle disabled:opacity-40 ${
            saveState === 'saved'
              ? 'bg-green-600 text-white'
              : saveState === 'error'
              ? 'bg-rust text-white'
              : 'bg-ink text-white hover:bg-black'
          }`}
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {saveState === 'saved' ? '✓ Saved' : saveState === 'error' ? 'Error — retry' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ─── Add Post modal ─────────────────────────────────────────────────────────
function AddPostModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (automation: PostAutomation) => void;
}) {
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
      setError('Could not fetch post. Check the URL and make sure your Facebook page is connected in Settings.');
      return;
    }
    setPreview({ ...result, post_preview_text: result.post_preview_text || '' });
  };

  const handleAdd = async () => {
    if (!preview) return;
    setSaving(true);
    const result = await upsertPostAutomation({
      post_id: preview.post_id,
      post_platform: platform,
      post_preview_text: preview.post_preview_text,
      post_thumbnail_url: preview.post_thumbnail_url || undefined,
      reply_as_comment: false,
      delete_negative: false,
      send_as_messenger: false,
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
      reply_as_comment: false,
      instructions: null,
      delete_negative: false,
      delete_examples: [],
      send_as_messenger: false,
      product_ids: [],
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-cards shadow-2xl border border-dove/15 w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-serif text-ink">Add Post Automation</h3>
          <button onClick={onClose} className="p-1 text-ash hover:text-ink rounded-full hover:bg-fog transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-graphite uppercase tracking-wider block mb-1.5">Platform</label>
            <div className="flex gap-2">
              {(['facebook', 'instagram'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`flex-1 py-2 rounded-inputs border text-xs font-semibold capitalize transition-all ${
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
                className="flex-1 px-3 py-2 bg-fog border border-dove/20 rounded-inputs text-xs focus:outline-none focus:border-ink transition-all"
              />
              <button
                onClick={handleFetch}
                disabled={!url.trim() || fetching}
                className="px-3 py-2 bg-ink text-white rounded-inputs text-xs font-semibold hover:bg-black disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Fetch
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-rust">{error}</p>}

          {preview && (
            <div className="flex items-start gap-3 p-3 bg-fog rounded-inputs border border-dove/10">
              {preview.post_thumbnail_url ? (
                <img src={preview.post_thumbnail_url} alt="Post" className="w-12 h-12 object-cover rounded shrink-0" />
              ) : (
                <div className="w-12 h-12 bg-dove/20 rounded shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-ink line-clamp-3">{preview.post_preview_text || '(no caption)'}</p>
                <p className="text-[10px] text-graphite font-mono mt-0.5">{preview.post_id}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-ash hover:text-ink transition-colors">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!preview || saving}
            className="px-4 py-2 bg-ink text-white rounded-buttons text-xs font-semibold hover:bg-black disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Add automation
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main SocialClient ──────────────────────────────────────────────────────
export default function SocialClient({
  initialAutomations,
  products,
}: {
  initialAutomations: PostAutomation[];
  products: Product[];
}) {
  const [automations, setAutomations] = useState<PostAutomation[]>(initialAutomations);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAdded = (a: PostAutomation) => {
    setAutomations(prev => [a, ...prev.filter(x => x.post_id !== a.post_id)]);
    setExpandedId(a.post_id);
    setShowAddModal(false);
  };

  const handleSaved = (postId: string, updated: PostAutomation) => {
    setAutomations(prev => prev.map(a => a.post_id === postId ? updated : a));
  };

  const handleDeleted = (postId: string) => {
    setAutomations(prev => prev.filter(a => a.post_id !== postId));
    if (expandedId === postId) setExpandedId(null);
  };

  const activeCount = automations.filter(a => a.reply_as_comment || a.send_as_messenger || a.delete_negative).length;

  return (
    <div className="flex-1 overflow-y-auto h-full w-full">
      <div className="max-w-[860px] mx-auto py-8 px-4 sm:px-6 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-[44px] font-serif text-ink tracking-tight leading-none mb-1.5">Social Automation</h1>
            <p className="text-ash text-sm">AI replies, private DMs, and comment moderation — per post, not globally.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-buttons text-xs font-semibold hover:bg-black transition-all shadow-subtle self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Add post
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Automated posts', value: automations.length, sub: 'configured' },
            { label: 'Active automations', value: activeCount, sub: 'with at least one toggle on' },
            { label: 'Channels supported', value: 2, sub: 'Facebook · Instagram' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-cards border border-dove/10 shadow-subtle px-4 py-3">
              <p className="text-2xl font-serif font-medium text-ink">{s.value}</p>
              <p className="text-[10px] font-bold text-graphite uppercase tracking-wider mt-0.5">{s.label}</p>
              <p className="text-[10px] text-ash">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Guardrail notice */}
        <div className="flex items-start gap-3 p-4 rounded-cards bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 leading-relaxed">
            <strong>System guardrail (not overridable):</strong> Public comment replies will never include order details, payment status, or personal customer information — regardless of your instructions. If a reply would require it, the AI deflects to "please check your inbox" and handles specifics via private DM.
          </div>
        </div>

        {/* Post list */}
        {automations.length === 0 ? (
          <div className="bg-white rounded-cards border border-dove/10 shadow-subtle p-16 text-center">
            <Megaphone className="w-8 h-8 text-graphite mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-ink mb-1">No posts automated yet</p>
            <p className="text-xs text-ash max-w-xs mx-auto">Add a Facebook or Instagram post URL to start configuring per-post comment automation.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-ink text-white rounded-buttons text-xs font-semibold hover:bg-black transition-colors"
            >
              Add your first post
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {automations.map(a => {
              const isExpanded = expandedId === a.post_id;
              const activeToggles = [a.reply_as_comment, a.send_as_messenger, a.delete_negative].filter(Boolean).length;

              return (
                <div key={a.post_id} className="bg-white rounded-cards border border-dove/10 shadow-subtle overflow-hidden">
                  {/* Row header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : a.post_id)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-fog/40 transition-colors text-left"
                  >
                    {a.post_thumbnail_url ? (
                      <img src={a.post_thumbnail_url} alt="Post" className="w-10 h-10 object-cover rounded-inputs shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-fog rounded-inputs shrink-0 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-graphite" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink leading-snug truncate">
                        {a.post_preview_text || 'Post ' + a.post_id.slice(0, 12) + '...'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          a.post_platform === 'instagram'
                            ? 'bg-pink-50 text-pink-700 border-pink-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>{a.post_platform}</span>
                        {activeToggles > 0 && (
                          <span className="text-[9px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                            {activeToggles} active
                          </span>
                        )}
                        {/* Mini toggle indicators */}
                        {a.reply_as_comment && <MessageSquare className="w-3 h-3 text-graphite" />}
                        {a.send_as_messenger && <Send className="w-3 h-3 text-graphite" />}
                        {a.delete_negative && <Trash2 className="w-3 h-3 text-graphite" />}
                        {a.product_ids.length > 0 && <Package className="w-3 h-3 text-graphite" />}
                      </div>
                    </div>
                    <Settings className="w-4 h-4 text-graphite shrink-0" />
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-graphite shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-graphite shrink-0" />}
                  </button>

                  {/* Expanded config */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-dove/10 pt-4">
                      <PostConfigPanel
                        automation={a}
                        products={products}
                        onSaved={updated => handleSaved(a.post_id, updated)}
                        onDeleted={() => handleDeleted(a.post_id)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddPostModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}
