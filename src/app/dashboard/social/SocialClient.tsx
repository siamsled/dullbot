'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Send, Trash2, Package, Plus, ExternalLink,
  ChevronRight, ChevronDown, Loader2, X, Settings, AlertTriangle,
  Megaphone, RefreshCw, Image as ImageIcon, CheckCircle2, Sparkles,
  ArrowDown, ArrowUp, AlertCircle
} from 'lucide-react';
import {
  upsertPostAutomation,
  deletePostAutomation,
  fetchPostPreview,
  getCommentStats,
  fetchConnectedSocialPosts,
  togglePostAutomationStatus,
  ConnectedPostItem,
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
        setTimeout(() => setSaveState('idle'), 3000);
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
      <div className="bg-fog/50 rounded-inputs p-3 border border-dove/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-graphite uppercase tracking-wider">Comment Stats</span>
          <button
            type="button"
            onClick={loadStats}
            disabled={loadingStats}
            className="text-[10px] text-ash hover:text-ink flex items-center gap-1 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loadingStats ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        {stats ? (
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-white p-2 rounded border border-dove/10">
              <p className="text-base font-serif font-semibold text-ink">{stats.total}</p>
              <p className="text-[9px] text-ash">Total</p>
            </div>
            <div className="bg-white p-2 rounded border border-dove/10">
              <p className="text-base font-serif font-semibold text-green-700">{stats.replied}</p>
              <p className="text-[9px] text-ash">Replied</p>
            </div>
            <div className="bg-white p-2 rounded border border-dove/10">
              <p className="text-base font-serif font-semibold text-blue-700">{stats.privateReplied}</p>
              <p className="text-[9px] text-ash">Private DMs</p>
            </div>
            <div className="bg-white p-2 rounded border border-dove/10">
              <p className="text-base font-serif font-semibold text-red-700">{stats.deleted}</p>
              <p className="text-[9px] text-ash">Moderated</p>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-ash italic">Click refresh to load live comment stats for this post.</p>
        )}
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-dove/10">
          <div>
            <p className="text-xs font-semibold text-ink">Public Comment Replies</p>
            <p className="text-[11px] text-ash">AI will reply publicly to customer comments on this post</p>
          </div>
          <Toggle value={config.reply_as_comment} onChange={v => setConfig(prev => ({ ...prev, reply_as_comment: v }))} />
        </div>

        <div className="flex items-center justify-between py-2 border-b border-dove/10">
          <div>
            <p className="text-xs font-semibold text-ink">Private Messenger Reply</p>
            <p className="text-[11px] text-ash">Send a private Messenger DM when someone comments on this post</p>
          </div>
          <Toggle value={config.send_as_messenger} onChange={v => setConfig(prev => ({ ...prev, send_as_messenger: v }))} />
        </div>

        <div className="flex items-center justify-between py-2 border-b border-dove/10">
          <div>
            <p className="text-xs font-semibold text-ink">Auto-Delete Spam / Hate</p>
            <p className="text-[11px] text-ash">Automatically delete negative, abusive, or competitor spam comments</p>
          </div>
          <Toggle value={config.delete_negative} onChange={v => setConfig(prev => ({ ...prev, delete_negative: v }))} />
        </div>
      </div>

      {/* Specific instructions */}
      <div>
        <label className="text-[10px] font-bold text-graphite uppercase tracking-wider block mb-1">
          Post-Specific AI Instructions (Optional)
        </label>
        <textarea
          rows={2}
          value={config.instructions || ''}
          onChange={e => setConfig(prev => ({ ...prev, instructions: e.target.value }))}
          placeholder="e.g. Highlight the 20% Eid discount or mention free shipping for this product..."
          className="w-full px-3 py-2 bg-fog border border-dove/20 rounded-inputs text-xs text-ink focus:outline-none focus:border-ink transition-colors resize-none"
        />
      </div>

      {/* Delete examples */}
      {config.delete_negative && (
        <div>
          <label className="text-[10px] font-bold text-graphite uppercase tracking-wider block mb-1">
            Phrases to Auto-Delete
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newDeleteExample}
              onChange={e => setNewDeleteExample(e.target.value)}
              placeholder="e.g. fake product, scam"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDeleteExample())}
              className="flex-1 px-3 py-1.5 bg-fog border border-dove/20 rounded-inputs text-xs text-ink focus:outline-none focus:border-ink"
            />
            <button
              type="button"
              onClick={addDeleteExample}
              className="px-3 py-1.5 bg-ink text-white rounded-inputs text-xs font-semibold hover:bg-black transition-colors"
            >
              Add
            </button>
          </div>
          {config.delete_examples?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {config.delete_examples.map((ex, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-[10px] font-medium">
                  {ex}
                  <button type="button" onClick={() => removeDeleteExample(i)} className="hover:text-red-900 font-bold">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Linked Products */}
      {products.length > 0 && (
        <div>
          <label className="text-[10px] font-bold text-graphite uppercase tracking-wider block mb-1">
            Linked Products (AI uses these for pricing/stock answers)
          </label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-fog rounded-inputs border border-dove/10">
            {products.map(p => {
              const isSelected = config.product_ids.includes(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-inputs text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white text-graphite border-dove/20 hover:border-dove/40'
                  }`}
                >
                  <Package className="w-3 h-3" />
                  {p.name} — {p.currency} {p.price}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-dove/10">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs font-semibold text-rust hover:text-red-700 flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Automation
        </button>

        <div className="flex items-center gap-2">
          {saveState === 'saved' && (
            <span className="text-xs font-semibold text-green-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Saved!
            </span>
          )}
          {saveState === 'error' && (
            <span className="text-xs font-semibold text-rust">Error saving</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 bg-ink text-white rounded-buttons text-xs font-semibold hover:bg-black disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-subtle"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
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
      post_id: post.post_id,
      post_platform: post.platform,
      post_preview_text: post.preview_text,
      post_thumbnail_url: post.thumbnail_url,
      reply_as_comment: false,
      instructions: null,
      delete_negative: false,
      delete_examples: [],
      send_as_messenger: false,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-cards shadow-2xl border border-dove/15 w-full max-w-lg p-6 space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-lg font-serif text-ink">Add Post Automation</h3>
          <button onClick={onClose} className="p-1 text-ash hover:text-ink rounded-full hover:bg-fog transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-dove/20 shrink-0">
          <button
            onClick={() => setTab('connected')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'connected' ? 'border-ink text-ink' : 'border-transparent text-ash hover:text-ink'
            }`}
          >
            Import Connected Social Posts ({connectedPosts.length})
          </button>
          <button
            onClick={() => setTab('url')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'url' ? 'border-ink text-ink' : 'border-transparent text-ash hover:text-ink'
            }`}
          >
            Paste Post URL
          </button>
        </div>

        {tab === 'connected' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[250px]">
            {connectedPosts.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Megaphone className="w-6 h-6 text-ash mx-auto opacity-40" />
                <p className="text-xs font-semibold text-ink">No published posts fetched</p>
                <p className="text-[11px] text-ash max-w-xs mx-auto">
                  {isConnected
                    ? 'Make sure you have published posts on your connected Facebook Page or Instagram.'
                    : 'Connect your Facebook Page or Instagram in Settings to auto-import published posts.'}
                </p>
                {!isConnected && (
                  <Link
                    href="/dashboard/settings"
                    className="inline-block px-3 py-1.5 bg-ink text-white rounded-buttons text-xs font-semibold hover:bg-black transition-colors mt-2"
                  >
                    Connect Social Accounts →
                  </Link>
                )}
              </div>
            ) : (
              connectedPosts.map((p) => (
                <div key={p.post_id} className="flex items-center gap-3 p-3 bg-fog rounded-inputs border border-dove/10 hover:border-dove/30 transition-all">
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt="Post" className="w-12 h-12 object-cover rounded-inputs shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-dove/20 rounded-inputs shrink-0 flex items-center justify-center">
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
                    className="px-3 py-1.5 bg-ink text-white rounded-buttons text-xs font-semibold hover:bg-black disabled:opacity-40 transition-colors shrink-0 flex items-center gap-1 shadow-subtle"
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
          <div className="space-y-3 shrink-0">
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

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-ash hover:text-ink transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAddManual}
                disabled={!preview || saving}
                className="px-4 py-2 bg-ink text-white rounded-buttons text-xs font-semibold hover:bg-black disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Add automation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Channel Icon ──────────────────────────────────────────────────────────
function ChannelIcon({ channel, className = "w-3.5 h-3.5" }: { channel?: string; className?: string }) {
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

// ─── iOS Green Toggle Switch ───────────────────────────────────────────────
function IosGreenSwitch({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Platform & Sort filters
  const [platformFilter, setPlatformFilter] = useState<'all' | 'facebook' | 'instagram'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Auto-fetched connected posts
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
    setConnectedPosts(res.posts || []);
    setLoadingPosts(false);
  };

  useEffect(() => {
    loadConnectedPosts();
  }, []);

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
        setExpandedId(post.post_id);
      } else {
        setAutomations(prev => prev.filter(x => x.post_id !== post.post_id));
        if (expandedId === post.post_id) setExpandedId(null);
      }
    } else {
      setErrorMessage(res.error || 'Failed to toggle automation status.');
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

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

  const fbCount = connectedPosts.filter(p => p.platform === 'facebook').length;
  const igCount = connectedPosts.filter(p => p.platform === 'instagram').length;

  // Filtered & Sorted Feed
  const filteredPosts = connectedPosts
    .filter(p => {
      if (platformFilter === 'facebook') return p.platform === 'facebook';
      if (platformFilter === 'instagram') return p.platform === 'instagram';
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.created_time).getTime();
      const timeB = new Date(b.created_time).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

  const automationMap = new Map(automations.map(a => [a.post_id, a]));

  return (
    <div className="flex-1 overflow-y-auto h-full w-full bg-fog/30">
      <div className="max-w-[760px] mx-auto py-8 px-4 sm:px-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-[36px] font-serif text-ink tracking-tight leading-none mb-1.5">Social Automation</h1>
            <p className="text-ash text-xs sm:text-sm">Manage AI comment replies, private Messenger DMs, and auto-moderation for your published posts.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-ink text-white rounded-buttons text-xs font-semibold hover:bg-black transition-all shadow-subtle self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Paste Post URL
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:bg-rose-100 rounded-full transition-colors"
            >
              <X className="w-3.5 h-3.5 text-rose-600" />
            </button>
          </div>
        )}

        {/* Control & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-white rounded-cards border border-dove/10 shadow-subtle">
          {/* Platform Filter Switcher */}
          <div className="flex items-center gap-1 bg-fog p-1 rounded-inputs border border-dove/10 w-full sm:w-auto">
            <button
              onClick={() => setPlatformFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                platformFilter === 'all' ? 'bg-white text-ink shadow-xs border border-dove/10' : 'text-ash hover:text-ink'
              }`}
            >
              All ({connectedPosts.length})
            </button>
            <button
              onClick={() => setPlatformFilter('facebook')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                platformFilter === 'facebook' ? 'bg-[#0084FF] text-white shadow-xs' : 'text-ash hover:text-[#0084FF]'
              }`}
            >
              <ChannelIcon channel="facebook" className="w-3.5 h-3.5" />
              Facebook ({fbCount})
            </button>
            <button
              onClick={() => setPlatformFilter('instagram')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                platformFilter === 'instagram' ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-xs' : 'text-ash hover:text-pink-600'
              }`}
            >
              <ChannelIcon channel="instagram" className="w-3.5 h-3.5" />
              Instagram ({igCount})
            </button>
          </div>

          {/* Sort Order Control */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-1.5 bg-white border border-dove/20 text-ink rounded-lg text-xs font-semibold hover:border-ink transition-all flex items-center gap-1.5 shadow-xs"
            >
              {sortOrder === 'desc' ? (
                <>
                  <ArrowDown className="w-3.5 h-3.5 text-rust" /> Newest First
                </>
              ) : (
                <>
                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> Oldest First
                </>
              )}
            </button>

            <button
              onClick={loadConnectedPosts}
              disabled={loadingPosts}
              className="p-2 bg-white border border-dove/20 text-ash hover:text-ink rounded-lg transition-all shadow-xs"
              title="Refresh Published Posts"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPosts ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feed State */}
        {loadingPosts ? (
          <div className="bg-white rounded-cards border border-dove/10 p-12 text-center text-xs text-ash flex flex-col items-center justify-center gap-3 shadow-subtle">
            <Loader2 className="w-6 h-6 animate-spin text-ink" />
            <p className="font-semibold text-ink">Syncing published posts from Facebook & Instagram...</p>
          </div>
        ) : !isConnected ? (
          <div className="bg-white rounded-cards border border-dove/10 p-8 text-center space-y-3 shadow-subtle">
            <Megaphone className="w-8 h-8 text-ash mx-auto opacity-40" />
            <p className="text-sm font-semibold text-ink">No Social Accounts Connected</p>
            <p className="text-xs text-ash max-w-sm mx-auto">
              Connect your Facebook Page or Instagram Business account in Settings to automatically sync published posts for 1-click comment automation.
            </p>
            <Link
              href="/dashboard/settings"
              className="inline-block px-4 py-2 bg-ink text-white rounded-buttons text-xs font-semibold hover:bg-black transition-colors"
            >
              Connect Social Accounts in Settings →
            </Link>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-white rounded-cards border border-dove/10 p-12 text-center text-xs text-ash space-y-2 shadow-subtle">
            <p className="font-semibold text-ink text-sm">No published posts found</p>
            <p className="text-ash max-w-xs mx-auto">Publish a post on Facebook or Instagram, or paste a post URL manually to set up AI automations.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredPosts.map(post => {
              const auto = automationMap.get(post.post_id);
              const isEnabled = !!auto;
              const isExpanded = expandedId === post.post_id;
              const isToggling = togglingPostId === post.post_id;

              return (
                <div key={post.post_id} className="bg-white rounded-cards border border-dove/15 shadow-subtle overflow-hidden transition-all hover:border-dove/30">
                  {/* Social Post Header */}
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
                        </div>
                        <p className="text-[11px] text-ash mt-0.5">
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
                        className="p-2 text-ash hover:text-ink transition-colors rounded-full hover:bg-fog shrink-0"
                        title="View original post on Meta"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Post Caption Body */}
                  <div className="p-4">
                    <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                      {post.preview_text}
                    </p>
                  </div>

                  {/* Post Image Thumbnail */}
                  {post.thumbnail_url && (
                    <div className="px-4 pb-4">
                      <div className="max-h-96 w-full rounded-inputs overflow-hidden bg-fog border border-dove/10">
                        <img src={post.thumbnail_url} alt="Post media" className="w-full h-full object-cover max-h-96" />
                      </div>
                    </div>
                  )}

                  {/* Action Bar with iOS Green Switch */}
                  <div className="p-4 bg-fog/40 border-t border-dove/10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <IosGreenSwitch
                        value={isEnabled}
                        disabled={isToggling}
                        onChange={(val) => handleToggleAutomation(post, val)}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                          {isEnabled ? 'Automate Comments: ON' : 'Automate Comments: OFF'}
                          {isToggling && <Loader2 className="w-3 h-3 animate-spin text-ash" />}
                        </span>
                        <span className="text-[10px] text-ash">
                          {isEnabled
                            ? 'AI handles public replies & private Messenger/IG DMs'
                            : 'Toggle switch green to enable AI replies for this post'}
                        </span>
                      </div>
                    </div>

                    {isEnabled && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : post.post_id)}
                        className="px-3 py-1.5 bg-white border border-dove/20 text-graphite hover:text-ink rounded-buttons text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all shrink-0"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        {isExpanded ? 'Hide Controls' : 'AI Instructions'}
                      </button>
                    )}
                  </div>

                  {/* Expanded AI Settings */}
                  {isEnabled && isExpanded && auto && (
                    <div className="p-5 border-t border-dove/10 bg-white">
                      <PostConfigPanel
                        automation={auto}
                        products={products}
                        onSaved={updated => handleSaved(post.post_id, updated)}
                        onDeleted={() => handleDeleted(post.post_id)}
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
          connectedPosts={connectedPosts}
          isConnected={isConnected}
          onClose={() => setShowAddModal(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}
