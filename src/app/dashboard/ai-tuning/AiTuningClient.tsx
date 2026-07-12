'use client';

import { useState, useTransition } from 'react';
import { Shield, MessageSquarePlus, Trash2, Loader2, Sparkles, Check, ChevronDown } from 'lucide-react';
import { saveAiTuning, addExampleReply, deleteExampleReply, testPersonaResponse } from './actions';

const renderMessagePart = (text: string) => {
  const parts = text.split(/(!\[.*?\]\(.*?\))/g);
  return parts.map((part, idx) => {
    const match = part.match(/!\[(.*?)\]\((.*?)\)/);
    if (match) {
       return <img key={idx} src={match[2]} alt={match[1]} className="mt-2 rounded-md max-w-full" />;
    }
    return <span key={idx}>{part}</span>;
  });
};

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

interface Props { shop: Shop; examples: ExampleReply[]; personas: AgentPersona[] }

export default function AiTuningClient({ shop, examples: initialExamples, personas }: Props) {
  const [isPending, startTransition] = useTransition();
  const [personaId, setPersonaId] = useState(shop.persona_id || (personas.length > 0 ? personas[0].id : ''));
  const [disclosureMode, setDisclosureMode] = useState(shop.disclosure_mode || 'reactive_honest');
  const [maxDiscount, setMaxDiscount] = useState(shop.max_discount_pct || 0);
  const [autoEscalate, setAutoEscalate] = useState(shop.auto_escalate_on_complaint ?? true);
  const [confidenceFallback, setConfidenceFallback] = useState(shop.confidence_fallback || 'say_checking');
  const [aiInstructions, setAiInstructions] = useState(shop.ai_instructions || '');
  const [examples, setExamples] = useState(initialExamples);
  
  const [newMsg, setNewMsg] = useState('');
  const [newReply, setNewReply] = useState('');
  const [saved, setSaved] = useState(false);
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);

  const [testMessage, setTestMessage] = useState('');
  const [testResponses, setTestResponses] = useState<Record<string, { msg: string, reply: string } | null>>({});
  const [isTesting, setIsTesting] = useState(false);

  const handleTestSend = async (pId: string) => {
    if (!testMessage.trim()) return;
    const msg = testMessage.trim();
    setTestMessage('');
    setIsTesting(true);
    setTestResponses(prev => ({ ...prev, [pId]: { msg, reply: 'Thinking...' } }));
    
    try {
      const res = await testPersonaResponse(pId, msg, {
        disclosure_mode: disclosureMode,
        max_discount_pct: maxDiscount,
        auto_escalate_on_complaint: autoEscalate,
        confidence_fallback: confidenceFallback,
        ai_instructions: aiInstructions,
      });
      if (res.success) {
        setTestResponses(prev => ({ ...prev, [pId]: { msg, reply: res.text || '' } }));
      } else {
         setTestResponses(prev => ({ ...prev, [pId]: { msg, reply: `Error: ${res.error || 'Could not get response.'}` } }));
      }
    } catch (error) {
       setTestResponses(prev => ({ ...prev, [pId]: { msg, reply: 'An unexpected error occurred.' } }));
    } finally {
      setIsTesting(false);
    }
  };

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

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif text-ink tracking-tight mb-3">Persona Agents</h1>
          <p className="text-ash text-lg">Pick the voice that represents your business.</p>
        </div>
        <button onClick={handleSave} disabled={isPending}
          className="flex items-center gap-2 px-8 py-3.5 rounded-buttons bg-ink text-white text-sm font-medium hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10 disabled:opacity-50">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? '✓ Saved' : 'Save Active Persona'}
        </button>
      </div>

      {!shop.persona_id && (
        <div className="mb-8 p-4 bg-sky-wash text-ink rounded-cards border border-blue-200">
          <strong>We've upgraded AI Tuning to Persona Agents!</strong> Pick who represents your business below.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        {personas.map(p => {
          const isSelected = p.id === personaId;
          const isExpanded = expandedPreview === p.id;
          
          return (
            <div key={p.id} className={`bg-white rounded-cards p-6 transition-all ${isSelected ? 'ring-2 ring-ink shadow-lg' : 'shadow-subtle border border-transparent hover:border-dove/20'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-medium text-ink">{p.name}</h2>
                    <span className="px-2 py-0.5 bg-fog text-graphite text-xs rounded-full uppercase tracking-wider font-semibold">{p.job_function.replace('_', ' ')}</span>
                  </div>
                  <p className="text-sm text-ash">{p.tagline}</p>
                </div>
                {isSelected ? (
                  <span className="flex items-center gap-1 text-sm font-medium text-ink bg-fog px-3 py-1.5 rounded-full">
                    <Check className="w-4 h-4" /> Active
                  </span>
                ) : (
                  <button onClick={() => setPersonaId(p.id)} className="px-4 py-2 bg-fog hover:bg-dove/20 text-ink text-sm font-medium rounded-buttons transition-colors">
                    Select
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mb-5">
                {p.personality_traits.map(t => (
                  <span key={t} className="px-2 py-1 bg-apricot-wash/50 text-rust text-xs rounded-md">#{t}</span>
                ))}
                {p.best_for.map(t => (
                  <span key={t} className="px-2 py-1 bg-sky-wash/50 text-blue-700 text-xs rounded-md">{t}</span>
                ))}
              </div>
              
              <div className="border-t border-dove/20 pt-4">
                <button onClick={() => setExpandedPreview(isExpanded ? null : p.id)} className="flex items-center justify-between w-full text-sm font-medium text-ink group">
                  Preview Conversation
                  <ChevronDown className={`w-4 h-4 text-ash transition-transform ${isExpanded ? 'rotate-180' : 'group-hover:text-ink'}`} />
                </button>
                
                {isExpanded && (
                  <div className="mt-4 space-y-3 bg-fog p-4 rounded-inputs">
                    {p.preview_dialogue.map((dlg, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="bg-white p-2.5 rounded-lg text-sm text-ink self-start max-w-[85%] shadow-sm border border-dove/10">
                          {dlg.customer_message}
                        </div>
                        <div className="flex flex-col space-y-1 items-end ml-auto max-w-[85%]">
                          {dlg.reply.split('|||').map((msg, i) => (
                            <div key={i} className="bg-ink p-2.5 rounded-lg text-sm text-white shadow-sm">
                              {renderMessagePart(msg.trim())}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isSelected && (
                <div className="mt-5 pt-5 border-t border-dove/20">
                  <label className="block text-sm font-medium text-ink mb-2">Send a text to see their response</label>
                  
                  {testResponses[p.id] && (
                    <div className="mb-4 space-y-2 bg-fog p-3 rounded-inputs text-sm">
                      <div className="bg-white p-2.5 rounded-lg text-ink self-start max-w-[85%] shadow-sm border border-dove/10">
                        {testResponses[p.id]?.msg}
                      </div>
                      <div className="flex flex-col space-y-1 items-end ml-auto max-w-[85%]">
                        {testResponses[p.id]?.reply.split('|||').map((bubble, i) => (
                          <div key={i} className="bg-ink p-2.5 rounded-lg text-white shadow-sm whitespace-pre-wrap">
                            {renderMessagePart(bubble.trim())}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input type="text" value={testMessage} onChange={e => setTestMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTestSend(p.id)} placeholder="e.g. Do you have this in medium?" disabled={isTesting} className="w-full bg-fog border-transparent rounded-inputs px-3 py-2 text-sm text-ink focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none disabled:opacity-50" />
                    <button onClick={() => handleTestSend(p.id)} disabled={isTesting || !testMessage.trim()} className="px-4 py-2 bg-ink text-white rounded-inputs text-sm font-medium hover:bg-black transition-colors shrink-0 disabled:opacity-50">
                      {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-cards shadow-subtle border border-transparent hover:border-dove/20 transition-colors p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-apricot-wash rounded-lg text-rust"><Shield className="w-5 h-5" /></div>
              <h2 className="text-xl font-medium text-ink">Guardrails & Disclosure</h2>
            </div>
            
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-fog rounded-inputs">
                <div>
                  <p className="text-sm font-medium text-ink">Max Discount</p>
                  <p className="text-xs text-ash mt-0.5">Max % the bot can offer. Set 0 to disable discounts entirely.</p>
                </div>
                <div className="flex items-center gap-1.5 ml-4">
                  <input type="number" min="0" max="100" value={maxDiscount} onChange={e => setMaxDiscount(parseFloat(e.target.value) || 0)} className="w-16 bg-white border border-dove/30 rounded-md px-2 py-1.5 text-sm text-ink text-center focus:border-ink/20 focus:outline-none" />
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
                <select value={confidenceFallback} onChange={e => setConfidenceFallback(e.target.value)} className="w-full bg-white border border-dove/30 rounded-inputs px-3 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none cursor-pointer">
                  <option value="guess">Give best guess with caveat</option>
                  <option value="say_checking">Say "Let me check on that" (safe)</option>
                  <option value="escalate">Immediately escalate to human</option>
                </select>
              </div>

              <div className="p-4 bg-fog rounded-inputs">
                <p className="text-sm font-medium text-ink mb-2">AI Disclosure Mode</p>
                <div className="space-y-2 mt-3">
                  <label className="flex items-center gap-3">
                    <input type="radio" name="disclosure" value="reactive_honest" checked={disclosureMode === 'reactive_honest'} onChange={() => setDisclosureMode('reactive_honest')} className="w-4 h-4 accent-ink" />
                    <span className="text-sm text-ink">Only if directly asked</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="radio" name="disclosure" value="proactive_upfront" checked={disclosureMode === 'proactive_upfront'} onChange={() => setDisclosureMode('proactive_upfront')} className="w-4 h-4 accent-ink" />
                    <span className="text-sm text-ink">Mention it upfront</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="radio" name="disclosure" value="playful_deflect_once" checked={disclosureMode === 'playful_deflect_once'} onChange={() => setDisclosureMode('playful_deflect_once')} className="w-4 h-4 accent-ink" />
                    <span className="text-sm text-ink">Playful once, then honest</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-cards shadow-subtle border border-transparent hover:border-dove/20 transition-colors p-8 relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-fog rounded-lg text-graphite"><Sparkles className="w-5 h-5" /></div>
              <h2 className="text-xl font-medium text-ink">Business Facts & Guidelines</h2>
            </div>
            <p className="text-sm text-ash mb-5 leading-relaxed">
              Feed the persona business rules (e.g. delivery costs, return policies, or store hours).
            </p>
            <textarea value={aiInstructions} onChange={e => setAiInstructions(e.target.value)} placeholder="e.g. Deliveries inside Dhaka take 2-3 days (charge 80 BDT)." rows={4} className="w-full bg-fog border border-transparent rounded-inputs py-3.5 px-4 text-ink text-sm focus:border-ink focus:ring-1 focus:ring-ink focus:outline-none transition-all placeholder:text-dove/70 resize-y" />
          </div>
        </div>

        <div className="bg-white rounded-cards shadow-subtle border border-transparent hover:border-dove/20 transition-colors p-8 self-start">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-fog rounded-lg text-graphite"><MessageSquarePlus className="w-5 h-5" /></div>
              <div>
                <h2 className="text-xl font-medium text-ink">Extra Examples</h2>
              </div>
            </div>
          </div>
          <p className="text-sm text-ash mb-4 leading-relaxed">Teach the persona how to reply to specific questions using their voice.</p>

          <div className="space-y-3 mb-5">
            {examples.map(ex => (
              <div key={ex.id} className="flex gap-3 p-4 bg-fog rounded-inputs">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ash mb-0.5">Customer</p>
                  <p className="text-sm text-ink">{ex.customer_message}</p>
                  <p className="text-xs text-ash mt-1.5 mb-0.5">Bot</p>
                  <p className="text-sm text-graphite">{ex.ideal_reply}</p>
                </div>
                <button onClick={() => handleDeleteExample(ex.id)} disabled={isPending} className="p-1.5 text-dove hover:text-rust transition-colors self-start shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>

          {examples.length < 10 && (
            <div className="border border-dove/20 rounded-inputs p-4 space-y-3">
              <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Customer message..." rows={2} className="w-full bg-fog border-0 rounded-inputs px-3 py-2 text-sm text-ink focus:outline-none placeholder:text-dove resize-none" />
              <textarea value={newReply} onChange={e => setNewReply(e.target.value)} placeholder="Ideal bot reply..." rows={2} className="w-full bg-fog border-0 rounded-inputs px-3 py-2 text-sm text-ink focus:outline-none placeholder:text-dove resize-none" />
              <button onClick={handleAddExample} disabled={isPending || !newMsg.trim() || !newReply.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-buttons bg-ink text-white text-xs font-medium hover:bg-black transition-colors disabled:opacity-50">
                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : '+ Add Example'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
