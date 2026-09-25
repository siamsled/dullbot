const fs = require('fs');

const path = 'src/app/dashboard/ai-tuning/AiTuningClient.tsx';
let code = fs.readFileSync(path, 'utf8');

// Fix the typo
code = code.replace(/dark:border-white\/20\/20/g, 'dark:border-white/20');
code = code.replace(/hover:bg-fog dark:bg-zinc-900\/50/g, 'hover:bg-fog dark:hover:bg-zinc-900/50');
code = code.replace(/bg-white dark:bg-zinc-900 rounded-full shadow transition-transform/g, 'bg-white rounded-full shadow transition-transform'); // for toggle button dot
code = code.replace(/bg-ink/g, 'bg-ink dark:bg-white'); // for toggles and radio dots
code = code.replace(/text-ink dark:text-zinc-100 dark:bg-white/g, 'text-ink dark:text-zinc-100'); // undoing on text
code = code.replace(/border-ink dark:border-white\/20 dark:bg-white/g, 'border-ink dark:border-white/20'); // undoing
code = code.replace(/dark:border-white dark:bg-white/g, 'dark:border-white');

// For the active tabs text color that got mangled if bg-ink dark:bg-white applied
code = code.replace(/bg-fog\/20 dark:bg-zinc-900\/50/g, 'bg-fog/20 dark:bg-white/5');

fs.writeFileSync(path, code);
