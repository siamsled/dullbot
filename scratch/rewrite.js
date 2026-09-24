const fs = require('fs');
const path = './src/app/dashboard/ai-tuning/AiTuningClient.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Change activeTab state
code = code.replace(
  `const [activeTab, setActiveTab] = useState<'test' | 'guardrails' | 'examples'>('test');`,
  `const [activeTab, setActiveTab] = useState<'guardrails' | 'examples'>('guardrails');`
);

// 2. We need to find the <main> tag and split it.
// We'll replace everything from `{/* ── Main Panel ──` to the end of the file.

const newStructure = `      {/* ── Middle Panel: Test Chat ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-fog border-r border-dove/20">

        {/* Header */}
        <div className="bg-white border-b border-dove/20 px-8 pt-5 pb-5 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <PersonaAvatar
                name={selectedPersona?.name || ''}
                className="w-14 h-14 ring-4 ring-fog shadow-sm"
              />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-serif font-bold text-ink tracking-tight leading-none">{selectedPersona?.name}</h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-apricot-wash text-rust font-bold border border-rust/10">
                    {JOB_FUNCTION_LABELS[selectedPersona?.job_function ?? ''] ?? selectedPersona?.job_function}
                  </span>
                </div>
                <p className="text-xs text-graphite mb-2">{selectedPersona?.tagline}</p>
                {selectedPersona && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPersona.personality_traits.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 bg-fog text-graphite rounded-full font-medium border border-dove/10 leading-none">#{t}</span>
                    ))}
                    {selectedPersona.best_for.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 bg-sky-wash text-blue-700 rounded-full font-medium border border-blue-200/40 leading-none">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 relative">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 pb-8">
              <PersonaAvatar
                name={selectedPersona?.name || ''}
                className="w-16 h-16 ring-4 ring-fog dark:ring-zinc-800 shadow-md transition-transform hover:scale-105"
              />
              <div>
                <p className="text-base font-serif font-bold text-ink dark:text-zinc-100 mb-0.5">Chat with {selectedPersona?.name}</p>
                <p className="text-xs text-graphite dark:text-zinc-400 max-w-xs leading-relaxed">
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
                      <div className="flex justify-end items-end gap-2">
                        <div className="flex flex-col max-w-[65%] items-end gap-1">
                          {d.reply.split('|||').map((msg, mi) => (
                            <div key={mi} className="px-4 py-2 text-[15px] bg-[#0084FF] text-white rounded-2xl rounded-tr-sm text-left">
                              {msg}
                            </div>
                          ))}
                        </div>
                        <div className="shrink-0 mb-1">
                          <PersonaAvatar name={selectedPersona?.name || ''} className="w-6 h-6 ring-1 ring-black/10 dark:ring-white/10" />
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
                  <div key={i} className={\`flex gap-2 items-end \${isCustomer ? 'justify-start' : 'justify-end'}\`}>
                    {!isCustomer && (
                      <div className="order-2 shrink-0 mb-1">
                        <PersonaAvatar name={selectedPersona?.name || ''} className="w-6 h-6 ring-1 ring-black/10 dark:ring-white/10" />
                      </div>
                    )}
                    <div className={\`flex flex-col max-w-[65%] gap-1 \${isCustomer ? 'items-start' : 'items-end order-1'}\`}>
                      {segments.map((segment, bi) => {
                        const isFirst = bi === 0;
                        return (
                          <div
                            key={bi}
                            className={\`px-4 py-2 text-[15px] text-left \${
                              isCustomer
                                ? \`bg-[#E4E6EB] text-[#050505] \${isFirst ? 'rounded-2xl rounded-tl-sm' : 'rounded-2xl'}\`
                                : segment.content === '…'
                                  ? \`bg-[#0084FF] text-white animate-pulse opacity-80 \${isFirst ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl'}\`
                                  : \`bg-[#0084FF] text-white \${isFirst ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl'}\`
                            }\`}
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
        <div className="shrink-0 bg-white">
          <MessengerInput 
            onSend={handleTestSend}
            disabled={isTesting}
            placeholder={\`Message \${selectedPersona?.name ?? 'the persona'}…\`}
            shopId={shop.id}
          />
        </div>
      </main>

      {/* ── Right Panel: Config ───────────────────────────────────────────── */}
      <aside className="w-[420px] shrink-0 bg-white flex flex-col">
        {/* Tabs */}
        <div className="flex gap-0 border-b border-dove/20 bg-white shrink-0">
          {([
            { id: 'guardrails', label: 'Guardrails', icon: Shield },
            { id: 'examples', label: \`Training Examples \${examples.length > 0 ? \`(\${examples.length})\` : ''}\`, icon: Sparkles },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={\`flex-1 flex justify-center items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors \${
                activeTab === tab.id
                  ? 'border-ink text-ink bg-fog/20'
                  : 'border-transparent text-graphite hover:text-ink hover:bg-fog/50'
              }\`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto bg-fog">
          {/* GUARDRAILS TAB */}
          {activeTab === 'guardrails' && (
`;

// we need to keep everything inside activeTab === 'guardrails' and activeTab === 'examples' from the original code
const guardrailsRegex = /{\/\* ── GUARDRAILS TAB ───────────────────────────────────────────── \*\/}\s*{\s*activeTab === 'guardrails' && \(\s*<div className="h-full overflow-y-auto px-8 py-6">([\s\S]*?)<\/div>\s*\)\s*}/;
const guardrailsMatch = code.match(guardrailsRegex);

const examplesRegex = /{\/\* ── EXAMPLES TAB ─────────────────────────────────────────────── \*\/}\s*{\s*activeTab === 'examples' && \(\s*<div className="h-full overflow-y-auto px-8 py-6">([\s\S]*?)<\/div>\s*\)\s*}/;
const examplesMatch = code.match(examplesRegex);

const newGuardrails = `            <div className="px-6 py-6">` + guardrailsMatch[1] + `</div>
          )}

          {/* EXAMPLES TAB */}
          {activeTab === 'examples' && (
            <div className="px-6 py-6">` + examplesMatch[1] + `</div>
          )}
        </div>
      </aside>
    </div>
  );
}`;

const mainPanelRegex = /{\/\* ── Main Panel ───────────────────────────────────────────────────────── \*\/}[\s\S]*?<\/div>\s*\);\s*}/;
code = code.replace(mainPanelRegex, newStructure + newGuardrails);

fs.writeFileSync(path, code);
