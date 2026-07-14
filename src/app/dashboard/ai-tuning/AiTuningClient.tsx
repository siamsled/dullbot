'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { AlertCircle, ChevronDown, Wand2, RefreshCw, Send, Loader2, Info, Plus, Sparkles, Trash2, Mic, Play, Pause, Check, ChevronRight, Bot, Shield, MessageSquarePlus, X, User } from 'lucide-react';
import MessengerInput from '@/components/dashboard/MessengerInput';
import { parseMessageSegments } from '@/lib/message-parser';
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
  allow_discounts?: boolean | null;
  escalation_severity?: string | null;
  handle_audio?: boolean | null;
  abusive_handling_mode?: string | null;
  abusive_block_threshold?: number | null;
  high_value_order_threshold?: number | null;
  off_topic_tolerance?: string | null;
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

type ChatMessage = { role: 'user' | 'bot'; content: string };

interface Props { shop: Shop; examples: ExampleReply[]; personas: AgentPersona[] }

// ─── Helpers ─────────────────────────────────────────────────────────────────



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
  const [allowDiscounts, setAllowDiscounts] = useState(shop.allow_discounts ?? false);
  const [escalationSeverity, setEscalationSeverity] = useState(shop.escalation_severity || 'serious_complaints');
  const [handleAudio, setHandleAudio] = useState(shop.handle_audio ?? true);
  const [abusiveHandlingMode, setAbusiveHandlingMode] = useState(shop.abusive_handling_mode || 'polite');
  const [abusiveBlockThreshold, setAbusiveBlockThreshold] = useState(shop.abusive_block_threshold || 3);
  const [highValueOrderThreshold, setHighValueOrderThreshold] = useState(shop.high_value_order_threshold || 0);
  const [offTopicTolerance, setOffTopicTolerance] = useState(shop.off_topic_tolerance || 'strict');
  
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
        allow_discounts: allowDiscounts,
        escalation_severity: escalationSeverity,
        handle_audio: handleAudio,
        abusive_handling_mode: abusiveHandlingMode,
        abusive_block_threshold: abusiveBlockThreshold,
        high_value_order_threshold: highValueOrderThreshold,
        off_topic_tolerance: offTopicTolerance,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const handleTestSend = async (msg: string, media?: any) => {
    const actualMsg = msg.trim() || (media ? (media.type === 'image' ? '[Image Attachment]' : '[Voice Message]') : '');
    if (!actualMsg || isTesting) return;
    setIsTesting(true);
    setChatHistory(prev => [...prev, { role: 'user', content: actualMsg }, { role: 'bot', content: '…' }]);

    try {
      const res = await testPersonaResponse(personaId, msg, {
        disclosure_mode: disclosureMode,
        max_discount_pct: maxDiscount,
        auto_escalate_on_complaint: autoEscalate,
        confidence_fallback: confidenceFallback,
        ai_instructions: (aiInstructions || '').trim(),
        allow_discounts: allowDiscounts,
        escalation_severity: escalationSeverity,
        handle_audio: handleAudio,
        abusive_handling_mode: abusiveHandlingMode,
        abusive_block_threshold: abusiveBlockThreshold,
        high_value_order_threshold: highValueOrderThreshold,
        off_topic_tolerance: offTopicTolerance,
      });
      const content = res.success
        ? (res.text || '')
        : `Error: ${res.error || 'Could not get a response.'}`;
      setChatHistory(prev => [...prev.slice(0, -1), { role: 'bot', content }]);
    } catch {
      setChatHistory(prev => [...prev.slice(0, -1), { role: 'bot', content: 'An unexpected error occurred.' }]);
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
    <div className="flex h-full overflow-hidden bg-fog">

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

        <div className="h-24 border-t border-dove/20 flex flex-col justify-center px-4">
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
        <div className="bg-white border-b border-dove/20 px-8 pt-4 pb-0 shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-serif text-ink tracking-tight leading-none">{selectedPersona?.name}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-apricot-wash text-rust font-medium">
                  {JOB_FUNCTION_LABELS[selectedPersona?.job_function ?? ''] ?? selectedPersona?.job_function}
                </span>
              </div>
              <p className="text-xs text-graphite mb-1.5">{selectedPersona?.tagline}</p>
              {selectedPersona && (
                <div className="flex flex-wrap gap-1">
                  {selectedPersona.personality_traits.map(t => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 bg-fog text-graphite rounded-full leading-none">#{t}</span>
                  ))}
                  {selectedPersona.best_for.map(t => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 bg-sky-wash/60 text-blue-700 rounded-full leading-none">{t}</span>
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
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">

          {/* ── TEST TAB ─────────────────────────────────────────────────── */}
          {activeTab === 'test' && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Chat area */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                {chatHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3 pb-8">
                    <div className="w-12 h-12 rounded-full bg-apricot-wash flex items-center justify-center">
                      <Bot className="w-5 h-5 text-rust" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink mb-1">Chat with {selectedPersona?.name}</p>
                      <p className="text-xs text-graphite max-w-xs leading-relaxed">
                        Send a message to see how this persona responds to your customers.
                      </p>
                    </div>
                    {selectedPersona?.preview_dialogue?.length > 0 && (
                      <div className="mt-4 space-y-4 max-w-md w-full">
                        <p className="text-[10px] text-dove text-center mb-2 uppercase tracking-wider font-medium">Sample exchanges</p>
                        {selectedPersona.preview_dialogue.map((d, i) => (
                          <div key={i} className="flex flex-col gap-2 w-full px-4">
                            <div className="flex justify-start">
                              <div className="flex flex-col max-w-[65%] items-start gap-1">
                                {d.customer_message.split('|||').map((msg, mi) => (
                                  <div key={mi} className="px-4 py-2 text-[15px] bg-[#E4E6EB] text-[#050505] rounded-2xl rounded-tl-sm text-left">
                                    {msg}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <div className="flex flex-col max-w-[65%] items-end gap-1">
                                {d.reply.split('|||').map((msg, mi) => (
                                  <div key={mi} className="px-4 py-2 text-[15px] bg-[#0084FF] text-white rounded-2xl rounded-tr-sm text-left">
                                    {msg}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {chatHistory.map((msg, i) => {
                      const isCustomer = msg.role === 'user';
                      const segments = msg.content === '…' ? [{ type: 'text' as const, content: '…' }] : parseMessageSegments(msg.content);
                      
                      return (
                        <div key={i} className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                          <div className={`flex flex-col max-w-[65%] gap-1 ${isCustomer ? 'items-start' : 'items-end'}`}>
                            {segments.map((segment, bi) => {
                              const isFirst = bi === 0;
                              return (
                                <div
                                  key={bi}
                                  className={`px-4 py-2 text-[15px] text-left ${
                                    isCustomer
                                      ? `bg-[#E4E6EB] text-[#050505] ${isFirst ? 'rounded-2xl rounded-tl-sm' : 'rounded-2xl'}`
                                      : segment.content === '…'
                                        ? `bg-[#0084FF] text-white animate-pulse opacity-80 ${isFirst ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl'}`
                                        : `bg-[#0084FF] text-white ${isFirst ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl'}`
                                  }`}
                                >
                                  {segment.type === 'image' ? (
                                    <img
                                      src={segment.content}
                                      alt="Attachment"
                                      className="rounded-xl max-w-full border border-dove/10"
                                    />
                                  ) : segment.type === 'audio' ? (
                                    <div className="py-1">
                                      <audio src={segment.content} controls className="max-w-full" />
                                    </div>
                                  ) : (
                                    segment.content
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              {/* Chat input */}
              <div className="shrink-0">
                <MessengerInput 
                  onSend={handleTestSend}
                  disabled={isTesting}
                  placeholder={`Message ${selectedPersona?.name ?? 'the persona'}…`}
                />
                
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

                {/* 1. Money & Orders */}
                <div className="bg-white rounded-[20px] p-6 shadow-subtle space-y-5">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-full bg-apricot-wash flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-rust" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">Money & Orders</p>
                      <p className="text-xs text-graphite">Rules for pricing and transaction limits</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-4 border-t border-dove/15">
                    <div>
                      <p className="text-sm font-medium text-ink">Allow Discounts</p>
                      <p className="text-xs text-graphite mt-0.5">Let the AI offer discounts when asked</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAllowDiscounts(!allowDiscounts)}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${allowDiscounts ? 'bg-ink' : 'bg-dove/40'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${allowDiscounts ? 'translate-x-5.5 left-0' : 'left-0.5'}`} />
                    </button>
                  </div>
                  
                  {allowDiscounts && (
                    <div className="flex items-center justify-between py-2 pl-4 border-l-2 border-dove/20 ml-2">
                      <div>
                        <p className="text-sm font-medium text-ink">Max Discount Percentage</p>
                        <p className="text-xs text-graphite mt-0.5">Maximum allowed reduction</p>
                      </div>
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
                  )}

                  <div className="flex items-center justify-between py-4 border-t border-dove/15">
                    <div>
                      <p className="text-sm font-medium text-ink">High-Value Order Review</p>
                      <p className="text-xs text-graphite mt-0.5">Hold orders over this amount for manual review (0 to disable)</p>
                    </div>
                    <div className="flex items-center bg-fog border border-dove/30 rounded-[12px] overflow-hidden">
                      <input
                        type="number"
                        min="0"
                        value={highValueOrderThreshold}
                        onChange={e => setHighValueOrderThreshold(parseFloat(e.target.value) || 0)}
                        className="w-20 bg-transparent px-3 py-2 text-sm text-ink text-center focus:outline-none"
                      />
                      <span className="text-sm text-graphite pr-3">BDT</span>
                    </div>
                  </div>
                </div>

                {/* 2. Escalation & Tone */}
                <div className="bg-white rounded-[20px] p-6 shadow-subtle space-y-5">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-full bg-sky-wash flex items-center justify-center">
                      <Shield className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">Escalation & Tone</p>
                      <p className="text-xs text-graphite">How the AI handles complaints, abuse, and off-topic chat</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-4 border-t border-dove/15">
                    <div>
                      <p className="text-sm font-medium text-ink">Auto-Escalate on Complaint</p>
                      <p className="text-xs text-graphite mt-0.5">Flag for human takeover when customer is frustrated</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoEscalate(!autoEscalate)}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${autoEscalate ? 'bg-ink' : 'bg-dove/40'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoEscalate ? 'translate-x-5.5 left-0' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {autoEscalate && (
                    <div className="py-2 pl-4 border-l-2 border-dove/20 ml-2 space-y-2">
                      <p className="text-sm font-medium text-ink mb-2">Escalation Sensitivity</p>
                      {[
                        { val: 'any_frustration', label: 'Escalate on any frustration', desc: 'Highly sensitive trigger' },
                        { val: 'serious_complaints', label: 'Only on serious complaints', desc: 'Allows AI to resolve minor issues' },
                      ].map(opt => (
                        <label htmlFor={`escalation-${opt.val}`} key={opt.val} className="flex items-center gap-3 cursor-pointer">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${escalationSeverity === opt.val ? 'border-ink bg-ink' : 'border-dove bg-white'}`}>
                            {escalationSeverity === opt.val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <input id={`escalation-${opt.val}`} name="escalationSeverity" type="radio" value={opt.val} checked={escalationSeverity === opt.val} onChange={() => setEscalationSeverity(opt.val)} className="hidden" />
                          <div>
                            <p className="text-sm text-ink">{opt.label}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="py-4 border-t border-dove/15">
                    <p className="text-sm font-medium text-ink mb-3">When Bot is Unsure</p>
                    <div className="space-y-2">
                      {[
                        { val: 'say_checking', label: 'Say "Let me check on that"', desc: 'Safe — never fabricates' },
                        { val: 'guess', label: 'Give best guess with caveat', desc: 'More proactive but may be wrong' },
                        { val: 'escalate', label: 'Escalate immediately', desc: 'Strictest — always transfers to staff' },
                      ].map(opt => (
                        <label htmlFor={`confidence-${opt.val}`} key={opt.val} className={`flex items-center gap-4 p-3 rounded-[12px] cursor-pointer transition-all border ${confidenceFallback === opt.val ? 'bg-fog border-ink/20 ring-1 ring-ink/10' : 'border-transparent hover:bg-fog'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${confidenceFallback === opt.val ? 'border-ink' : 'border-dove'}`}>
                            {confidenceFallback === opt.val && <div className="w-2 h-2 rounded-full bg-ink" />}
                          </div>
                          <input id={`confidence-${opt.val}`} name="confidenceFallback" type="radio" value={opt.val} checked={confidenceFallback === opt.val} onChange={() => setConfidenceFallback(opt.val)} className="hidden" />
                          <div>
                            <p className="text-sm font-medium text-ink">{opt.label}</p>
                            <p className="text-xs text-graphite">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="py-4 border-t border-dove/15">
                    <p className="text-sm font-medium text-ink mb-3">Abusive Customers</p>
                    <div className="space-y-2">
                      {[
                        { val: 'polite', label: 'Just stay polite and continue', desc: 'Ignore insults and stay professional' },
                        { val: 'flag', label: 'Flag conversation for review', desc: 'Flags after repeated abuse' },
                        { val: 'block', label: 'Auto-block after N incidents', desc: 'Ties into fraud-flag feature' },
                      ].map(opt => (
                        <label htmlFor={`abusive-${opt.val}`} key={opt.val} className={`flex items-center gap-4 p-3 rounded-[12px] cursor-pointer transition-all border ${abusiveHandlingMode === opt.val ? 'bg-fog border-ink/20 ring-1 ring-ink/10' : 'border-transparent hover:bg-fog'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${abusiveHandlingMode === opt.val ? 'border-ink' : 'border-dove'}`}>
                            {abusiveHandlingMode === opt.val && <div className="w-2 h-2 rounded-full bg-ink" />}
                          </div>
                          <input id={`abusive-${opt.val}`} name="abusiveHandlingMode" type="radio" value={opt.val} checked={abusiveHandlingMode === opt.val} onChange={() => setAbusiveHandlingMode(opt.val)} className="hidden" />
                          <div>
                            <p className="text-sm font-medium text-ink">{opt.label}</p>
                            <p className="text-xs text-graphite">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {abusiveHandlingMode === 'block' && (
                      <div className="flex items-center gap-3 mt-3 pl-11">
                        <p className="text-sm text-graphite">Incidents before blocking:</p>
                        <input
                          type="number"
                          min="1"
                          value={abusiveBlockThreshold}
                          onChange={e => setAbusiveBlockThreshold(parseInt(e.target.value) || 3)}
                          className="w-16 bg-fog border border-dove/30 rounded-[12px] px-3 py-1.5 text-sm text-ink text-center focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="py-4 border-t border-dove/15">
                    <p className="text-sm font-medium text-ink mb-3">Off-Topic Tolerance</p>
                    <div className="space-y-2">
                      {[
                        { val: 'strict', label: 'Stay strictly on business topics', desc: 'Firmly redirect personal chatter' },
                        { val: 'casual', label: 'Allow some casual chat', desc: 'Friendly banter before redirecting' },
                      ].map(opt => (
                        <label htmlFor={`offtopic-${opt.val}`} key={opt.val} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-fog rounded-[12px] transition-colors">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${offTopicTolerance === opt.val ? 'border-ink bg-ink' : 'border-dove bg-white'}`}>
                            {offTopicTolerance === opt.val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <input id={`offtopic-${opt.val}`} name="offTopicTolerance" type="radio" value={opt.val} checked={offTopicTolerance === opt.val} onChange={() => setOffTopicTolerance(opt.val)} className="hidden" />
                          <div>
                            <p className="text-sm text-ink font-medium">{opt.label}</p>
                            <p className="text-xs text-graphite">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Honesty */}
                <div className="bg-white rounded-[20px] p-6 shadow-subtle space-y-5">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-full bg-fog flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-graphite" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">Honesty & Media</p>
                      <p className="text-xs text-graphite">Disclosure and multi-modal handling</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-ink mb-3">AI Disclosure Mode</p>
                    <div className="space-y-2">
                      {[
                        { val: 'reactive_honest', label: 'Only if directly asked', desc: 'Most natural — stays in character until questioned' },
                        { val: 'proactive_upfront', label: 'Mention upfront', desc: 'Discloses in the very first message' },
                        { val: 'playful_deflect_once', label: 'Playful once, then honest', desc: 'One joke, then comes clean if pressed' },
                      ].map(opt => (
                        <label htmlFor={`disclosure-${opt.val}`} key={opt.val} className={`flex items-start gap-4 p-4 rounded-[16px] cursor-pointer transition-all border ${disclosureMode === opt.val ? 'bg-fog border-ink/20 ring-1 ring-ink/10' : 'border-transparent hover:bg-fog'}`}>
                          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${disclosureMode === opt.val ? 'border-ink' : 'border-dove'}`}>
                            {disclosureMode === opt.val && <div className="w-2 h-2 rounded-full bg-ink" />}
                          </div>
                          <input id={`disclosure-${opt.val}`} name="disclosureMode" type="radio" value={opt.val} checked={disclosureMode === opt.val} onChange={() => setDisclosureMode(opt.val)} className="hidden" />
                          <div>
                            <p className="text-sm font-medium text-ink">{opt.label}</p>
                            <p className="text-xs text-graphite mt-0.5">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-4 border-t border-dove/15">
                    <div>
                      <p className="text-sm font-medium text-ink">Listen to Voice Messages</p>
                      <p className="text-xs text-graphite mt-0.5">Toggle whether the AI processes audio (saves tokens if off)</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHandleAudio(!handleAudio)}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${handleAudio ? 'bg-ink' : 'bg-dove/40'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${handleAudio ? 'translate-x-5.5 left-0' : 'left-0.5'}`} />
                    </button>
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
                  <div className="space-y-6">
                    {examples.map(ex => (
                      <div key={ex.id} className="relative group">
                        <div className="flex flex-col gap-2 w-full px-2">
                          <div className="flex justify-start">
                            <div className="flex flex-col max-w-[65%] items-start gap-1">
                              {ex.customer_message.split('|||').map((msg, mi) => (
                                <div key={mi} className="px-4 py-2 text-[15px] bg-[#E4E6EB] text-[#050505] rounded-2xl rounded-tl-sm text-left">
                                  {msg}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <div className="flex flex-col max-w-[65%] items-end gap-1">
                              {ex.ideal_reply.split('|||').map((msg, mi) => (
                                <div key={mi} className="px-4 py-2 text-[15px] bg-[#0084FF] text-white rounded-2xl rounded-tr-sm text-left">
                                  {msg}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteExample(ex.id)}
                          disabled={isPending}
                          className="absolute -top-2 -right-2 p-1.5 bg-white rounded-full shadow-subtle border border-dove/10 text-dove hover:text-rust opacity-0 group-hover:opacity-100 transition-all z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>
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
