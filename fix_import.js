const fs = require('fs');
let code = fs.readFileSync('gfg-main/src/pages/Dashboard.tsx', 'utf8');
code = code.replace(
  "  Lock, AlertCircle, Calendar, ArrowRight, ShieldCheck, Sparkles, Inbox\n  Download",
  "  Lock, AlertCircle, Calendar, ArrowRight, ShieldCheck, Sparkles, Inbox,\n  Download"
);
fs.writeFileSync('gfg-main/src/pages/Dashboard.tsx', code);
