const fs = require('fs');
const path = require('path');

const files = [
  'src/app/fsportz/page.tsx',
  'src/app/fsportz/match/[id]/page.tsx',
  'src/components/fsportz/StreamWaiting.tsx',
  'src/components/fsportz/MatchCard.tsx',
  'src/components/fsportz/MatchCountdown.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace rgba(34,197,94, opacity) with rgba(255,255,255, opacity)
  content = content.replace(/rgba\(34,197,94/g, 'rgba(255,255,255');
  
  // Replace #22c55e with #ffffff
  content = content.replace(/#22c55e/g, '#ffffff');

  // Replace #16a34a with #e5e5e5
  content = content.replace(/#16a34a/g, '#e5e5e5');

  // Replace #4ade80 with #f5f5f5
  content = content.replace(/#4ade80/g, '#f5f5f5');

  // Replace #86efac with #d4d4d4
  content = content.replace(/#86efac/g, '#d4d4d4');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Replaced colors in ${file}`);
});
