const fs = require('fs');

const path = 'src/app/dashboard/ai-tuning/AiTuningClient.tsx';
let code = fs.readFileSync(path, 'utf8');

// We only want to modify the right panel, which starts around line 524
const rightPanelStart = code.indexOf('{/* ── Right Panel: Config');
const rightPanelEnd = code.length;

let rightPanelCode = code.substring(rightPanelStart, rightPanelEnd);

// Replacements
rightPanelCode = rightPanelCode.replace(/bg-white/g, 'bg-white dark:bg-zinc-900');
rightPanelCode = rightPanelCode.replace(/bg-fog/g, 'bg-fog dark:bg-zinc-900/50');
rightPanelCode = rightPanelCode.replace(/text-ink/g, 'text-ink dark:text-zinc-100');
rightPanelCode = rightPanelCode.replace(/text-graphite/g, 'text-graphite dark:text-zinc-400');
rightPanelCode = rightPanelCode.replace(/border-dove\/15/g, 'border-dove/15 dark:border-white/10');
rightPanelCode = rightPanelCode.replace(/border-dove\/20/g, 'border-dove/20 dark:border-white/10');
rightPanelCode = rightPanelCode.replace(/border-dove\/30/g, 'border-dove/30 dark:border-white/10');
rightPanelCode = rightPanelCode.replace(/border-ink/g, 'border-ink dark:border-white/20');
rightPanelCode = rightPanelCode.replace(/ring-ink/g, 'ring-ink dark:ring-white');
rightPanelCode = rightPanelCode.replace(/shadow-subtle/g, 'shadow-subtle dark:shadow-none dark:ring-1 dark:ring-white/10');

code = code.substring(0, rightPanelStart) + rightPanelCode;

fs.writeFileSync(path, code);
