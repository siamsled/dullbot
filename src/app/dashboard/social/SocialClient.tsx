'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Send, Trash2, Package, Plus, ExternalLink,
  ChevronRight, ChevronDown, Loader2, X, Settings, AlertTriangle,
  Megaphone, RefreshCw, Image as ImageIcon, CheckCircle2, Sparkles
} from 'lucide-react';
import {
  upsertPostAutomation,
  deletePostAutomation,
  fetchPostPreview,
  getCommentStats,
  fetchConnectedSocialPosts,
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

  // Auto-fetched connected posts
  const [connectedPosts, setConnectedPosts] = useState<ConnectedPostItem[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const loadConnectedPosts = async () => {
    setLoadingPosts(true);
    const res = await fetchConnectedSocialPosts();
    setIsConnected(res.connected);
    setConnectedPosts(res.posts);
    setLoadingPosts(false);
  };

  useEffect(() => {
    loadConnectedPosts();
  }, []);

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
  const automatedPostIds = new Set(automations.map(a => a.post_id));

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

        {/* ── AUTO-SYNCED CONNECTED SOCIAL POSTS FEED ────────────────────── */}
        <div className="bg-white rounded-cards border border-dove/10 shadow-subtle p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rust" />
              <h3 className="text-sm font-semibold text-ink">Published Posts from Connected Socials</h3>
            </div>
            <button
              onClick={loadConnectedPosts}
              disabled={loadingPosts}
              className="text-xs text-ash hover:text-ink flex items-center gap-1 font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPosts ? 'animate-spin' : ''}`} />
              Sync Posts
            </button>
          </div>

          {loadingPosts ? (
            <div className="py-8 text-center text-xs text-ash flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-ink" />
              Fetching recent published posts from Meta Graph API...
            </div>
          ) : !isConnected ? (
            <div className="p-4 bg-fog rounded-inputs border border-dove/10 text-center space-y-2">
              <p className="text-xs font-semibold text-ink">No Social Accounts Connected</p>
              <p className="text-[11px] text-ash max-w-sm mx-auto">
                Connect your Facebook Page or Instagram in Settings to automatically sync published posts for 1-click comment automation.
              </p>
              <Link
                href="/dashboard/settings"
                className="inline-block px-3 py-1.5 bg-ink text-white rounded-buttons text-xs font-semibold hover:bg-black transition-colors"
              >
                Connect Social Accounts in Settings →
              </Link>
            </div>
          ) : connectedPosts.length === 0 ? (
            <p className="text-xs text-ash italic text-center py-4">
              No recent published posts found on your connected Facebook Page or Instagram.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {connectedPosts.map((post) => {
                const isAlreadyAdded = automatedPostIds.has(post.post_id);
                return (
                  <div key={post.post_id} className="p-3 bg-fog/60 rounded-inputs border border-dove/10 flex items-start gap-3 hover:border-dove/30 transition-all">
                    {post.thumbnail_url ? (
                      <img src={post.thumbnail_url} alt="Post" className="w-12 h-12 object-cover rounded-inputs shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-dove/20 rounded-inputs shrink-0 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-graphite" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-ink line-clamp-2 leading-snug">{post.preview_text}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          post.platform === 'instagram'
                            ? 'bg-pink-50 text-pink-700 border-pink-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {post.platform}
                        </span>

                        {isAlreadyAdded ? (
                          <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-600" /> Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddModal(true);
                            }}
                            className="text-[10px] font-bold text-ink hover:underline flex items-center gap-0.5"
                          >
                            + Automate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Configured Post list */}
        {automations.length === 0 ? (
          <div className="bg-white rounded-cards border border-dove/10 shadow-subtle p-12 text-center">
            <Megaphone className="w-8 h-8 text-graphite mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-ink mb-1">No post automations active yet</p>
            <p className="text-xs text-ash max-w-xs mx-auto">Select a published post from above or click Add Post to configure AI comment &amp; DM replies.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-ink text-white rounded-buttons text-xs font-semibold hover:bg-black transition-colors"
            >
              Add post automation
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-graphite uppercase tracking-wider px-1">Configured Automations ({automations.length})</h3>
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
          connectedPosts={connectedPosts}
          isConnected={isConnected}
          onClose={() => setShowAddModal(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}
