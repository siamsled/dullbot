'use client';

import { useState, useTransition } from 'react';
import { Sliders, Languages, Shield, MessageSquarePlus, Trash2, Loader2, ChevronDown, Eye } from 'lucide-react';
import { saveAiTuning, addExampleReply, deleteExampleReply } from './actions';
import { buildSystemPrompt } from '@/lib/prompt-builder';

type Shop = {
  id: string;
  name: string;
  tone_formal_casual: number;
  tone_concise_detailed: number;
  tone_professional_warm: number;
  language_mix: string;
  emoji_frequency: string;
  max_discount_pct: number;
  auto_escalate_on_complaint: boolean;
  confidence_fallback: string;
  disclose_ai_if_asked: boolean;
  ai_instructions?: string | null;
};

type ExampleReply = { id: string; customer_message: string; ideal_reply: string };

interface Props { shop: Shop; examples: ExampleReply[] }

function ToneSlider({ label, leftLabel, rightLabel, value, onChange }: {
  label: string; leftLabel: string; rightLabel: string; value: number; onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-xs text-ash">{value < 33 ? leftLabel : value > 66 ? rightLabel : 'Balanced'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-ash w-16 text-right shrink-0">{leftLabel}</span>
        <input
          type="range" min="0" max="100" value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          className="flex-1 h-1.5 bg-dove/30 rounded-full accent-ink cursor-pointer"
        />
        <span className="text-xs text-ash w-16 shrink-0">{rightLabel}</span>
      </div>
    </div>
  );
}

function SegmentedControl({ label, options, value, onChange }: {
  label: string; options: { id: string; label: string }[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <p className="text-sm font-medium text-ink mb-2">{label}</p>
      <div className="flex gap-1 bg-fog p-1 rounded-inputs">
        {options.map(o => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
              value === o.id ? 'bg-white text-ink shadow-subtle' : 'text-ash hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AiTuningClient({ shop, examples: initialExamples }: Props) {
  const [isPending, startTransition] = useTransition();
  const [tone1, setTone1] = useState(shop.tone_formal_casual);
  const [tone2, setTone2] = useState(shop.tone_concise_detailed);
  const [tone3, setTone3] = useState(shop.tone_professional_warm);
  const [language, setLanguage] = useState(shop.language_mix);
  const [emoji, setEmoji] = useState(shop.emoji_frequency);
  const [maxDiscount, setMaxDiscount] = useState(shop.max_discount_pct);
  const [autoEscalate, setAutoEscalate] = useState(shop.auto_escalate_on_complaint);
  const [confidenceFallback, setConfidenceFallback] = useState(shop.confidence_fallback);
  const [discloseAi, setDiscloseAi] = useState(shop.disclose_ai_if_asked);
  const [aiInstructions, setAiInstructions] = useState(shop.ai_instructions || '');
  const [examples, setExamples] = useState(initialExamples);
  const [newMsg, setNewMsg] = useState('');
  const [newReply, setNewReply] = useState('');
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = () => {
    startTransition(async () => {
      await saveAiTuning({
        tone_formal_casual: tone1,
        tone_concise_detailed: tone2,
        tone_professional_warm: tone3,
        language_mix: language,
        emoji_frequency: emoji,
        max_discount_pct: maxDiscount,
        auto_escalate_on_complaint: autoEscalate,
        confidence_fallback: confidenceFallback,
        disclose_ai_if_asked: discloseAi,
        ai_instructions: aiInstructions.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const handleAddExample = async () => {
    if (!newMsg.trim() || !newReply.trim()) return;
    startTransition(async () => {
      await addExampleReply(shop.id, newMsg.trim(), newReply.trim());
      setExamples(prev => [...prev, { id: Date.now().toString(), customer_message: newMsg.trim(), ideal_reply: newReply.trim() }]);
      setNewMsg(''); setNewReply('');
    });
  };

  const handleDeleteExample = (id: string) => {
    startTransition(async () => {
      await deleteExampleReply(id);
      setExamples(prev => prev.filter(e => e.id !== id));
    });
  };

  const previewPrompt = buildSystemPrompt(
    { name: shop.name, tone_formal_casual: tone1, tone_concise_detailed: tone2, tone_professional_warm: tone3,
      language_mix: language, emoji_frequency: emoji, max_discount_pct: maxDiscount,
      auto_escalate_on_complaint: autoEscalate, confidence_fallback: confidenceFallback,
      disclose_ai_if_asked: discloseAi, ai_instructions: aiInstructions.trim() || null },
    [{ name: 'Example Product', price: 1000, currency: 'BDT' }],
    examples
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-4xl font-serif text-ink tracking-tight mb-3">AI Tuning</h1>
        <p className="text-ash text-lg">Configure how DullBot speaks to your customers without writing a single line of prompt.</p>
      </div>

      <div className="space-y-6">
        {/* Card 1: Tone */}
        <div className="bg-white rounded-cards shadow-subtle border border-transparent hover:border-dove/20 transition-colors p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-sky-wash rounded-lg text-blue-600"><Sliders className="w-5 h-5" /></div>
            <h2 className="text-xl font-medium text-ink">Tone & Style</h2>
          </div>
          <div className="space-y-6">
            <ToneSlider label="Formality" leftLabel="Formal" rightLabel="Casual" value={tone1} onChange={setTone1} />
            <ToneSlider label="Response Length" leftLabel="Brief" rightLabel="Detailed" value={tone2} onChange={setTone2} />
            <ToneSlider label="Warmth" leftLabel="Professional" rightLabel="Warm" value={tone3} onChange={setTone3} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <SegmentedControl
                label="Language"
                options={[{ id: 'en', label: 'English' }, { id: 'bn', label: 'বাংলা' }, { id: 'bn_en_mix', label: 'Banglish' }]}
                value={language}
                onChange={setLanguage}
              />
              <SegmentedControl
                label="Emoji Usage"
                options={[{ id: 'none', label: 'None' }, { id: 'light', label: 'Light' }, { id: 'heavy', label: 'Heavy' }]}
                value={emoji}
                onChange={setEmoji}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Guardrails */}
        <div className="bg-white rounded-cards shadow-subtle border border-transparent hover:border-dove/20 transition-colors p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-apricot-wash rounded-lg text-rust"><Shield className="w-5 h-5" /></div>
            <h2 className="text-xl font-medium text-ink">Guardrails</h2>
          </div>
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 bg-fog rounded-inputs">
              <div>
                <p className="text-sm font-medium text-ink">Max Discount</p>
                <p className="text-xs text-ash mt-0.5">Max % the bot can offer. Set 0 to disable discounts entirely.</p>
              </div>
              <div className="flex items-center gap-1.5 ml-4">
                <input type="number" min="0" max="100" value={maxDiscount}
                  onChange={e => setMaxDiscount(parseFloat(e.target.value) || 0)}
                  className="w-16 bg-white border border-dove/30 rounded-md px-2 py-1.5 text-sm text-ink text-center focus:border-ink/20 focus:outline-none" />
                <span className="text-sm text-ash">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-fog rounded-inputs">
              <div>
                <p className="text-sm font-medium text-ink">Auto-Escalate on Complaint</p>
                <p className="text-xs text-ash mt-0.5">Flag conversation for human takeover when customer is upset.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input type="checkbox" className="sr-only peer" checked={autoEscalate} onChange={e => setAutoEscalate(e.target.checked)} />
                <div className="w-11 h-6 bg-dove/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ink"></div>
              </label>
            </div>

            <div className="p-4 bg-fog rounded-inputs">
              <p className="text-sm font-medium text-ink mb-2">When Bot is Unsure</p>
              <select value={confidenceFallback} onChange={e => setConfidenceFallback(e.target.value)}
                className="w-full bg-white border border-dove/30 rounded-inputs px-3 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none cursor-pointer">
                <option value="guess">Give best guess with caveat</option>
                <option value="say_checking">Say "Let me check on that" (safe)</option>
                <option value="escalate">Immediately escalate to human</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-fog rounded-inputs">
              <div>
                <p className="text-sm font-medium text-ink">Disclose AI if Asked</p>
                <p className="text-xs text-ash mt-0.5">Confirm being an AI when customer directly asks.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input type="checkbox" className="sr-only peer" checked={discloseAi} onChange={e => setDiscloseAi(e.target.checked)} />
                <div className="w-11 h-6 bg-dove/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ink"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Custom AI prompt configurations */}
        <div className="bg-white rounded-cards shadow-subtle border border-transparent hover:border-dove/20 transition-colors p-8 relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-fog rounded-lg text-graphite">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-medium text-ink">AI Custom Instructions & Vibe</h2>
          </div>
          <p className="text-sm text-ash mb-5 leading-relaxed">
            Configure custom details about your shop (like product guidelines, delivery notes, or business hours) and customize the bot's tone/personality (e.g. "Be very polite and use formal Bengali", or "Be super casual, reply in Banglish").
          </p>
          <textarea
            value={aiInstructions}
            onChange={e => setAiInstructions(e.target.value)}
            placeholder="e.g. Always greet customers with 'Assalamu Alaikum'. Deliveries inside Dhaka take 2-3 days (charge 80 BDT), outside Dhaka takes 5 days (charge 150 BDT). Use casual Banglish."
            rows={4}
            className="w-full bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none transition-all placeholder:text-dove/70 resize-y"
          />
        </div>

        {/* Card 3: Example Replies */}
        <div className="bg-white rounded-cards shadow-subtle border border-transparent hover:border-dove/20 transition-colors p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-fog rounded-lg text-graphite"><MessageSquarePlus className="w-5 h-5" /></div>
              <div>
                <h2 className="text-xl font-medium text-ink">Example Replies</h2>
                {examples.length >= 10 && (
                  <p className="text-xs text-rust mt-0.5">10 examples max reached — delete one to add more.</p>
                )}
              </div>
            </div>
            <span className="text-sm text-ash">{examples.length}/10</span>
          </div>

          <div className="space-y-3 mb-5">
            {examples.map(ex => (
              <div key={ex.id} className="flex gap-3 p-4 bg-fog rounded-inputs">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ash mb-0.5">Customer</p>
                  <p className="text-sm text-ink">{ex.customer_message}</p>
                  <p className="text-xs text-ash mt-1.5 mb-0.5">Bot</p>
                  <p className="text-sm text-graphite">{ex.ideal_reply}</p>
                </div>
                <button onClick={() => handleDeleteExample(ex.id)} disabled={isPending}
                  className="p-1.5 text-dove hover:text-rust transition-colors self-start shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {examples.length < 10 && (
            <div className="border border-dove/20 rounded-inputs p-4 space-y-3">
              <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Customer message..."
                rows={2} className="w-full bg-fog border-0 rounded-inputs px-3 py-2 text-sm text-ink focus:outline-none placeholder:text-dove resize-none" />
              <textarea value={newReply} onChange={e => setNewReply(e.target.value)} placeholder="Ideal bot reply..."
                rows={2} className="w-full bg-fog border-0 rounded-inputs px-3 py-2 text-sm text-ink focus:outline-none placeholder:text-dove resize-none" />
              <button onClick={handleAddExample} disabled={isPending || !newMsg.trim() || !newReply.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-buttons bg-ink text-white text-xs font-medium hover:bg-black transition-colors disabled:opacity-50">
                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : '+ Add Example'}
              </button>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="bg-white rounded-cards shadow-subtle border border-dove/10">
          <button onClick={() => setShowPreview(v => !v)}
            className="w-full flex items-center justify-between px-8 py-5 text-left">
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-graphite" />
              <span className="text-base font-medium text-ink">Preview Generated Prompt</span>
              <span className="text-xs text-ash">See exactly what the AI reads</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-ash transition-transform ${showPreview ? 'rotate-180' : ''}`} />
          </button>
          {showPreview && (
            <div className="px-8 pb-6">
              <pre className="bg-fog rounded-inputs p-4 text-xs text-graphite font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {previewPrompt}
              </pre>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={isPending}
            className="flex items-center gap-2 px-8 py-3.5 rounded-buttons bg-ink text-white text-sm font-medium hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10 disabled:opacity-50">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? '✓ Saved' : 'Save AI Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
