'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import {
  Shield, MessageSquarePlus, Trash2, Loader2, Sparkles,
  Check, ChevronRight, Send, Bot, User, AlertCircle, Plus, X
} from 'lucide-react';
import { saveAiTuning, addExampleReply, deleteExampleReply, testPersonaResponse } from './actions';

// ─── Types ──────────────────────────────────────────────────────────────────

type Shop = {
  id: string;
  name: string;
  persona_id: string | null;
  persona_custom_name: string | null;
  disclosure_mode: string;
  max_discount_pct: number;
  auto_escalate_on_complaint: boolean;
  confidence_fallback: string;
  ai_instructions?: string | null;
};

type ExampleReply = { id: string; customer_message: string; ideal_reply: string };

type AgentPersona = {
  id: string;
  name: string;
  tagline: string;
  avatar_url: string | null;
  job_function: string;
  personality_traits: string[];
  best_for: string[];
  language_style: string;
  full_specification: string;
  preview_dialogue: { customer_message: string; reply: string }[];
  disclosure_line: string;
};

type ChatMessage = { role: 'user' | 'bot'; bubbles: string[] };

interface Props { shop: Shop; examples: ExampleReply[]; personas: AgentPersona[] }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderBubbleContent(text: string) {
  const parts = text.split(/(!\[.*?\]\(.*?\))/g);
  return parts.map((part, idx) => {
    const match = part.match(/!\[(.*?)\]\((.*?)\)/);
    if (match) {
      return (
        <img
          key={idx}
          src={match[2]}
          alt={match[1]}
          className="mt-2 rounded-xl max-w-full border border-white/10"
        />
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

const JOB_FUNCTION_LABELS: Record<string, string> = {
  negotiator: 'Negotiator',
  reassurer: 'Reassurer',
  explainer: 'Explainer',
  closer: 'Closer',
  problem_solver: 'Problem Solver',
  advisor: 'Advisor',
  professional: 'Professional',
  caretaker: 'Caretaker',
};

const LANGUAGE_STYLE_LABELS: Record<string, string> = {
  bangla_heavy: 'Bangla',
  banglish: 'Banglish',
  formal_bangla: 'Formal Bangla',
  english: 'English',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AiTuningClient({ shop, examples: initialExamples, personas }: Props) {
  const [isPending, startTransition] = useTransition();

  // Persona selection
  const [personaId, setPersonaId] = useState(
    shop.persona_id || (personas.length > 0 ? personas[0].id : '')
  );

  // Guardrail settings
  const [disclosureMode, setDisclosureMode] = useState(shop.disclosure_mode || 'reactive_honest');
  const [maxDiscount, setMaxDiscount] = useState(shop.max_discount_pct || 0);
  const [autoEscalate, setAutoEscalate] = useState(shop.auto_escalate_on_complaint ?? true);
  const [confidenceFallback, setConfidenceFallback] = useState(shop.confidence_fallback || 'say_checking');
  const [aiInstructions, setAiInstructions] = useState(shop.ai_instructions || '');
  const [saved, setSaved] = useState(false);

  // Examples
  const [examples, setExamples] = useState(initialExamples);
  const [newMsg, setNewMsg] = useState('');
  const [newReply, setNewReply] = useState('');
  const [showAddExample, setShowAddExample] = useState(false);

  // Live test chat
  const [testInput, setTestInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Right panel tab
  const [activeTab, setActiveTab] = useState<'test' | 'guardrails' | 'examples'>('test');

  const selectedPersona = personas.find(p => p.id === personaId) ?? personas[0];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Reset chat when persona changes
  useEffect(() => { setChatHistory([]); }, [personaId]);

  const handleSave = () => {
    startTransition(async () => {
      await saveAiTuning({
        persona_id: personaId,
        persona_custom_name: null,
        disclosure_mode: disclosureMode,
        max_discount_pct: maxDiscount,
        auto_escalate_on_complaint: autoEscalate,
        confidence_fallback: confidenceFallback,
        ai_instructions: aiInstructions.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const handleTestSend = async () => {
    const msg = testInput.trim();
    if (!msg || isTesting) return;
    setTestInput('');
    setIsTesting(true);
    setChatHistory(prev => [...prev, { role: 'user', bubbles: [msg] }, { role: 'bot', bubbles: ['…'] }]);

    try {
      const res = await testPersonaResponse(personaId, msg, {
        disclosure_mode: disclosureMode,
        max_discount_pct: maxDiscount,
        auto_escalate_on_complaint: autoEscalate,
        confidence_fallback: confidenceFallback,
        ai_instructions: aiInstructions,
      });
      const bubbles = res.success
        ? (res.text || '').split('|||').map(s => s.trim()).filter(Boolean)
        : [`Error: ${res.error || 'Could not get a response.'}`];
      setChatHistory(prev => [...prev.slice(0, -1), { role: 'bot', bubbles }]);
    } catch {
      setChatHistory(prev => [...prev.slice(0, -1), { role: 'bot', bubbles: ['An unexpected error occurred.'] }]);
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddExample = async () => {
    if (!newMsg.trim() || !newReply.trim()) return;
    startTransition(async () => {
      await addExampleReply(shop.id, newMsg.trim(), newReply.trim());
      setExamples(prev => [...prev, {
        id: Date.now().toString(),
        customer_message: newMsg.trim(),
        ideal_reply: newReply.trim(),
      }]);
      setNewMsg(''); setNewReply(''); setShowAddExample(false);
    });
  };

  const handleDeleteExample = (id: string) => {
    startTransition(async () => {
      await deleteExampleReply(id);
      setExamples(prev => prev.filter(e => e.id !== id));
    });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-fog">

      {/* ── Left Sidebar: Persona Picker ────────────────────────────────────── */}
      <aside className="w-72 shrink-0 bg-white border-r border-dove/20 flex flex-col">
        <div className="px-5 pt-6 pb-4 border-b border-dove/20">
          <h1 className="text-2xl font-serif text-ink tracking-tight leading-tight">Persona Agents</h1>
          <p className="text-xs text-graphite mt-1">Choose the voice of your AI</p>
        </div>

        <div className="overflow-y-auto py-3 px-3 space-y-1">
          {personas.map(p => {
            const isActive = p.id === personaId;
            return (
              <button
                key={p.id}
                onClick={() => setPersonaId(p.id)}
                className={`w-full text-left px-3 py-3.5 rounded-[16px] transition-all group ${
                  isActive
                    ? 'bg-ink text-white shadow-md'
                    : 'hover:bg-fog text-ink'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[13px] font-semibold leading-tight ${isActive ? 'text-white' : 'text-ink'}`}>
                    {p.name}
                  </span>
                  {isActive
                    ? <Check className="w-3.5 h-3.5 text-white/70 shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-dove group-hover:text-graphite shrink-0" />
                  }
                </div>
                <p className={`text-[11px] leading-snug ${isActive ? 'text-white/65' : 'text-graphite'}`}>
                  {p.tagline}
                </p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    isActive ? 'bg-white/15 text-white/80' : 'bg-apricot-wash text-rust'
                  }`}>
                    {JOB_FUNCTION_LABELS[p.job_function] ?? p.job_function}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    isActive ? 'bg-white/15 text-white/80' : 'bg-sky-wash text-blue-700'
                  }`}>
                    {LANGUAGE_STYLE_LABELS[p.language_style] ?? p.language_style}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-dove/20">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-ink text-white text-sm font-medium hover:bg-black transition-all disabled:opacity-50 active:scale-95"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><Check className="w-4 h-4" />Saved!</> : 'Save Changes'}
          </button>
        </div>
      </aside>

      {/* ── Main Panel ───────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-dove/20 px-8 pt-6 pb-0 shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-serif text-ink tracking-tight">{selectedPersona?.name}</h2>
                <span className="text-xs px-2.5 py-1 rounded-full bg-apricot-wash text-rust font-medium">
                  {JOB_FUNCTION_LABELS[selectedPersona?.job_function ?? ''] ?? selectedPersona?.job_function}
                </span>
              </div>
              <p className="text-sm text-graphite">{selectedPersona?.tagline}</p>
              {selectedPersona && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selectedPersona.personality_traits.map(t => (
                    <span key={t} className="text-[11px] px-2 py-0.5 bg-fog text-graphite rounded-full">#{t}</span>
                  ))}
                  {selectedPersona.best_for.map(t => (
                    <span key={t} className="text-[11px] px-2 py-0.5 bg-sky-wash/60 text-blue-700 rounded-full">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-dove/20 -mb-px">
            {([
              { id: 'test', label: 'Test Persona', icon: Bot },
              { id: 'guardrails', label: 'Guardrails', icon: Shield },
              { id: 'examples', label: `Training Examples ${examples.length > 0 ? `(${examples.length})` : ''}`, icon: Sparkles },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-ink text-ink'
                    : 'border-transparent text-graphite hover:text-ink'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">

          {/* ── TEST TAB ─────────────────────────────────────────────────── */}
          {activeTab === 'test' && (
            <div className="h-full flex flex-col">
              {/* Chat area */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                {chatHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-4 pb-16">
                    <div className="w-16 h-16 rounded-full bg-apricot-wash flex items-center justify-center">
                      <Bot className="w-7 h-7 text-rust" />
                    </div>
                    <div>
                      <p className="text-base font-medium text-ink mb-1">Chat with {selectedPersona?.name}</p>
                      <p className="text-sm text-graphite max-w-xs leading-relaxed">
                        Send a message to see how this persona responds to your customers.
                      </p>
                    </div>
                    {selectedPersona?.preview_dialogue?.length > 0 && (
                      <div className="mt-2 space-y-2 max-w-sm w-full">
                        <p className="text-xs text-dove text-center mb-3 uppercase tracking-wider">Sample exchanges</p>
                        {selectedPersona.preview_dialogue.map((d, i) => (
                          <div key={i} className="bg-white rounded-[20px] p-4 shadow-subtle text-left space-y-2">
                            <div className="flex items-start gap-2">
                              <User className="w-3.5 h-3.5 text-graphite mt-0.5 shrink-0" />
                              <p className="text-xs text-ash">{d.customer_message}</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <Bot className="w-3.5 h-3.5 text-rust mt-0.5 shrink-0" />
                              <p className="text-xs text-graphite">{d.reply.split('|||')[0]}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'bot' && (
                          <div className="w-7 h-7 rounded-full bg-apricot-wash flex items-center justify-center shrink-0 mt-0.5">
                            <Bot className="w-3.5 h-3.5 text-rust" />
                          </div>
                        )}
                        <div className={`flex flex-col gap-1.5 max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          {msg.bubbles.map((bubble, bi) => (
                            <div
                              key={bi}
                              className={`px-4 py-2.5 rounded-[18px] text-sm leading-relaxed ${
                                msg.role === 'user'
                                  ? 'bg-ink text-white rounded-tr-sm'
                                  : bubble === '…'
                                    ? 'bg-white text-graphite shadow-subtle animate-pulse rounded-tl-sm'
                                    : 'bg-white text-ink shadow-subtle rounded-tl-sm'
                              }`}
                            >
                              {renderBubbleContent(bubble)}
                            </div>
                          ))}
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-7 h-7 rounded-full bg-fog border border-dove/30 flex items-center justify-center shrink-0 mt-0.5">
                            <User className="w-3.5 h-3.5 text-graphite" />
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              {/* Chat input */}
              <div className="shrink-0 px-8 py-4 bg-white border-t border-dove/20">
                <div className="flex items-center gap-3 bg-fog rounded-full pl-5 pr-2 py-2 border border-dove/20 focus-within:border-ink/30 focus-within:bg-white transition-all">
                  <input
                    type="text"
                    value={testInput}
                    onChange={e => setTestInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleTestSend()}
                    placeholder={`Message ${selectedPersona?.name ?? 'the persona'}…`}
                    disabled={isTesting}
                    className="flex-1 bg-transparent text-sm text-ink placeholder:text-dove focus:outline-none disabled:opacity-60"
                  />
                  <button
                    onClick={handleTestSend}
                    disabled={isTesting || !testInput.trim()}
                    className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center hover:bg-black transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 shrink-0"
                  >
                    {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                {chatHistory.length > 0 && (
                  <button
                    onClick={() => setChatHistory([])}
                    className="text-xs text-dove hover:text-graphite mt-2 mx-auto block transition-colors"
                  >
                    Clear conversation
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── GUARDRAILS TAB ───────────────────────────────────────────── */}
          {activeTab === 'guardrails' && (
            <div className="h-full overflow-y-auto px-8 py-6">
              <div className="max-w-2xl space-y-5">

                {/* AI Disclosure */}
                <div className="bg-white rounded-[20px] p-6 shadow-subtle">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-full bg-apricot-wash flex items-center justify-center">
                      <Shield className="w-4 h-4 text-rust" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">AI Disclosure</p>
                      <p className="text-xs text-graphite">When should the bot reveal it's an AI?</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { val: 'reactive_honest', label: 'Only when directly asked', desc: 'Most natural — stays in character until questioned' },
                      { val: 'proactive_upfront', label: 'Mention it upfront', desc: 'Discloses in the very first message' },
                      { val: 'playful_deflect_once', label: 'Playful once, then honest', desc: 'One joke, then comes clean if pressed' },
                    ].map(opt => (
                      <label
                        key={opt.val}
                        className={`flex items-start gap-4 p-4 rounded-[16px] cursor-pointer transition-all border ${
                          disclosureMode === opt.val
                            ? 'bg-fog border-ink/20 ring-1 ring-ink/10'
                            : 'border-transparent hover:bg-fog'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          disclosureMode === opt.val ? 'border-ink' : 'border-dove'
                        }`}>
                          {disclosureMode === opt.val && <div className="w-2 h-2 rounded-full bg-ink" />}
                        </div>
                        <input
                          type="radio"
                          name="disclosure"
                          value={opt.val}
                          checked={disclosureMode === opt.val}
                          onChange={() => setDisclosureMode(opt.val)}
                          className="sr-only"
                        />
                        <div>
                          <p className="text-sm font-medium text-ink">{opt.label}</p>
                          <p className="text-xs text-graphite mt-0.5">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Pricing & Escalation */}
                <div className="bg-white rounded-[20px] p-6 shadow-subtle space-y-5">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-full bg-sky-wash flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">Pricing & Escalation</p>
                      <p className="text-xs text-graphite">Control discount authority and complaint handling</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-4 border-t border-dove/15">
                    <div>
                      <p className="text-sm font-medium text-ink">Max Discount</p>
                      <p className="text-xs text-graphite mt-0.5">Set to 0 to disable discounts entirely</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-fog border border-dove/30 rounded-[12px] overflow-hidden">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={maxDiscount}
                          onChange={e => setMaxDiscount(parseFloat(e.target.value) || 0)}
                          className="w-14 bg-transparent px-3 py-2 text-sm text-ink text-center focus:outline-none"
                        />
                        <span className="text-sm text-graphite pr-3">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-4 border-t border-dove/15">
                    <div>
                      <p className="text-sm font-medium text-ink">Auto-Escalate on Complaint</p>
                      <p className="text-xs text-graphite mt-0.5">Flag for human takeover when customer is frustrated</p>
                    </div>
                    <button
                      onClick={() => setAutoEscalate(!autoEscalate)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${autoEscalate ? 'bg-ink' : 'bg-dove/40'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoEscalate ? 'translate-x-5.5 left-0' : 'left-0.5'}`} />
                    </button>
                  </div>

                  <div className="py-4 border-t border-dove/15">
                    <p className="text-sm font-medium text-ink mb-3">When Bot is Unsure</p>
                    <div className="space-y-2">
                      {[
                        { val: 'say_checking', label: 'Say "Let me check on that"', desc: 'Safe — never fabricates' },
                        { val: 'guess', label: 'Give best guess with caveat', desc: 'More proactive but may be wrong' },
                        { val: 'escalate', label: 'Escalate immediately', desc: 'Strictest — always transfers to staff' },
                      ].map(opt => (
                        <label
                          key={opt.val}
                          className={`flex items-center gap-4 p-3 rounded-[12px] cursor-pointer transition-all border ${
                            confidenceFallback === opt.val
                              ? 'bg-fog border-ink/20 ring-1 ring-ink/10'
                              : 'border-transparent hover:bg-fog'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            confidenceFallback === opt.val ? 'border-ink' : 'border-dove'
                          }`}>
                            {confidenceFallback === opt.val && <div className="w-2 h-2 rounded-full bg-ink" />}
                          </div>
                          <input type="radio" name="fallback" value={opt.val} checked={confidenceFallback === opt.val} onChange={() => setConfidenceFallback(opt.val)} className="sr-only" />
                          <div>
                            <p className="text-sm font-medium text-ink">{opt.label}</p>
                            <p className="text-xs text-graphite">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Business facts */}
                <div className="bg-white rounded-[20px] p-6 shadow-subtle">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-fog flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-graphite" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">Business Facts & Guidelines</p>
                      <p className="text-xs text-graphite">Custom rules the AI will always follow</p>
                    </div>
                  </div>
                  <textarea
                    value={aiInstructions}
                    onChange={e => setAiInstructions(e.target.value)}
                    placeholder="e.g. Deliveries inside Dhaka take 2–3 days (charge 80 BDT). We don't accept returns on sale items."
                    rows={5}
                    className="w-full bg-fog border border-transparent rounded-[16px] py-3.5 px-4 text-ink text-sm focus:border-ink/30 focus:ring-1 focus:ring-ink/20 focus:outline-none focus:bg-white transition-all placeholder:text-dove resize-none leading-relaxed"
                  />
                </div>

                <div className="pb-6" />
              </div>
            </div>
          )}

          {/* ── EXAMPLES TAB ─────────────────────────────────────────────── */}
          {activeTab === 'examples' && (
            <div className="h-full overflow-y-auto px-8 py-6">
              <div className="max-w-2xl">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm text-graphite">Teach the persona how to reply to specific questions using their voice.</p>
                  </div>
                  {examples.length < 10 && (
                    <button
                      onClick={() => setShowAddExample(!showAddExample)}
                      className="flex items-center gap-1.5 text-sm text-ink border border-dove/30 px-3 py-2 rounded-full hover:bg-fog transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Example
                    </button>
                  )}
                </div>

                {showAddExample && (
                  <div className="bg-white rounded-[20px] p-5 shadow-subtle mb-5 border border-ink/10">
                    <p className="text-sm font-semibold text-ink mb-4">New Training Example</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-graphite mb-1.5">Customer message</label>
                        <textarea
                          value={newMsg}
                          onChange={e => setNewMsg(e.target.value)}
                          placeholder="e.g. Delivery kotodin lagbe?"
                          rows={2}
                          className="w-full bg-fog border-0 rounded-[12px] px-4 py-3 text-sm text-ink focus:outline-none placeholder:text-dove resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-graphite mb-1.5">Ideal bot reply</label>
                        <textarea
                          value={newReply}
                          onChange={e => setNewReply(e.target.value)}
                          placeholder="e.g. Dhaka te 2-3 din laage. Area ta bolen, confirm kori."
                          rows={2}
                          className="w-full bg-fog border-0 rounded-[12px] px-4 py-3 text-sm text-ink focus:outline-none placeholder:text-dove resize-none"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleAddExample}
                          disabled={isPending || !newMsg.trim() || !newReply.trim()}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-ink text-white text-xs font-medium hover:bg-black transition-colors disabled:opacity-50"
                        >
                          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Example'}
                        </button>
                        <button
                          onClick={() => { setShowAddExample(false); setNewMsg(''); setNewReply(''); }}
                          className="px-4 py-2.5 rounded-full text-graphite text-xs hover:bg-fog transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {examples.length === 0 && !showAddExample ? (
                  <div className="text-center py-16">
                    <div className="w-12 h-12 rounded-full bg-fog flex items-center justify-center mx-auto mb-3">
                      <MessageSquarePlus className="w-5 h-5 text-dove" />
                    </div>
                    <p className="text-sm font-medium text-ink mb-1">No examples yet</p>
                    <p className="text-xs text-graphite">Add examples to shape how the persona responds to specific questions.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {examples.map(ex => (
                      <div key={ex.id} className="bg-white rounded-[20px] p-5 shadow-subtle group">
                        <div className="flex justify-between items-start gap-3">
                          <div className="space-y-3 flex-1 min-w-0">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-fog flex items-center justify-center shrink-0 mt-0.5">
                                <User className="w-3 h-3 text-graphite" />
                              </div>
                              <div>
                                <p className="text-[10px] text-dove uppercase tracking-wider mb-1">Customer</p>
                                <p className="text-sm text-ink">{ex.customer_message}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-apricot-wash flex items-center justify-center shrink-0 mt-0.5">
                                <Bot className="w-3 h-3 text-rust" />
                              </div>
                              <div>
                                <p className="text-[10px] text-dove uppercase tracking-wider mb-1">Bot</p>
                                <p className="text-sm text-graphite">{ex.ideal_reply}</p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteExample(ex.id)}
                            disabled={isPending}
                            className="p-1.5 text-dove hover:text-rust opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pb-6" />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
