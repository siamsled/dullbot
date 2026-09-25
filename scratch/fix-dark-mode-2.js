const fs = require('fs');
const path = 'src/app/dashboard/ai-tuning/AiTuningClient.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/bg-ink dark:bg-white text-white/g, 'bg-ink dark:bg-white text-white dark:text-ink');
code = code.replace(/dark:border-white\/20\/10/g, 'dark:border-white/10');
code = code.replace(/dark:border-white\/20\/30/g, 'dark:border-white/30');

// Fix toggle buttons text if they have dark:bg-white
// Wait, the toggle handles are `<div className="absolute ... bg-white dark:bg-zinc-900 rounded-full" />`
// Which is correct, the circle is dark when active in dark mode.

fs.writeFileSync(path, code);
