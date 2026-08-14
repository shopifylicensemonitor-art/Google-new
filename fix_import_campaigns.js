const fs = require('fs');
let code = fs.readFileSync('gfg-main/src/pages/Campaigns.tsx', 'utf8');
code = code.replace(
  "  UploadCloud, ListFilter, Check, ArrowRight, ArrowLeft, Users, Mail, Layers, X\n  Eye,",
  "  UploadCloud, ListFilter, Check, ArrowRight, ArrowLeft, Users, Mail, Layers, X,\n  Eye,"
);
fs.writeFileSync('gfg-main/src/pages/Campaigns.tsx', code);
