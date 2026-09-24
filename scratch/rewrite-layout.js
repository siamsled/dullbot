const fs = require('fs');
const path = './src/app/dashboard/ai-tuning/AiTuningClient.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. activeTab
code = code.replace(
  `const [activeTab, setActiveTab] = useState<'test' | 'guardrails' | 'examples'>('test');`,
  `const [activeTab, setActiveTab] = useState<'guardrails' | 'examples'>('guardrails');`
);

// 2. Main panel to Right panel start
code = code.replace(
  `      {/* ── Main Panel ───────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-dove/20 px-8 pt-5 pb-0 shrink-0">
          <div className="flex items-start justify-between mb-4">`,
  `      {/* ── Middle Panel: Test Chat ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-fog border-r border-dove/20">

        {/* Header */}
        <div className="bg-white border-b border-dove/20 px-8 pt-5 pb-5 shrink-0">
          <div className="flex items-start justify-between">`
);

code = code.replace(
  `          {/* Tabs */}
          <div className="flex gap-0 border-b border-dove/20 -mb-px">
            {([
              { id: 'test', label: 'Test Persona', icon: Bot },
              { id: 'guardrails', label: 'Guardrails', icon: Shield },
              { id: 'examples', label: \`Training Examples \${examples.length > 0 ? \`(\${examples.length})\` : ''}\`, icon: Sparkles },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={\`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors \${
                  activeTab === tab.id
                    ? 'border-ink text-ink'
                    : 'border-transparent text-graphite hover:text-ink'
                }\`}
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
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">`,
  `        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 relative">`
);

code = code.replace(
  `              {/* Chat input */}
              <div className="shrink-0">
                <MessengerInput 
                  onSend={handleTestSend}
                  disabled={isTesting}
                  placeholder={\`Message \${selectedPersona?.name ?? 'the persona'}…\`}
                  shopId={shop.id}
                />
              </div>
            </div>
          )}

          {/* ── GUARDRAILS TAB ───────────────────────────────────────────── */}
          {activeTab === 'guardrails' && (
            <div className="h-full overflow-y-auto px-8 py-6">`,
  `              {/* Chat input */}
              <div className="shrink-0 bg-white border-t border-dove/20">
                <MessengerInput 
                  onSend={handleTestSend}
                  disabled={isTesting}
                  placeholder={\`Message \${selectedPersona?.name ?? 'the persona'}…\`}
                  shopId={shop.id}
                />
              </div>
      </main>

      {/* ── Right Panel: Config ───────────────────────────────────────────── */}
      <aside className="w-[420px] shrink-0 bg-white flex flex-col border-l border-dove/20 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-10 relative">
        {/* Tabs */}
        <div className="flex gap-0 border-b border-dove/20 bg-white shrink-0">
          {([
            { id: 'guardrails', label: 'Guardrails', icon: Shield },
            { id: 'examples', label: \`Training Examples \${examples.length > 0 ? \`(\${examples.length})\` : ''}\`, icon: Sparkles },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={\`flex-1 flex justify-center items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors \${
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
            <div className="px-6 py-6">`
);

code = code.replace(
  `          {/* ── EXAMPLES TAB ─────────────────────────────────────────────── */}
          {activeTab === 'examples' && (
            <div className="h-full overflow-y-auto px-8 py-6">`,
  `          {/* ── EXAMPLES TAB ─────────────────────────────────────────────── */}
          {activeTab === 'examples' && (
            <div className="px-6 py-6">`
);

code = code.replace(
  `        </div>
      </main>
    </div>
  );
}
`,
  `        </div>
      </aside>
    </div>
  );
}
`
);

fs.writeFileSync(path, code);
console.log("Rewrote file!");
