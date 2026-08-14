const fs = require('fs');
let code = fs.readFileSync('gfg-main/src/pages/Campaigns.tsx', 'utf8');

// Add state
if (!code.includes('const [showPreview, setShowPreview]')) {
  code = code.replace(
    "const [bodyPlain, setBodyPlain] = useState<string>('');",
    "const [bodyPlain, setBodyPlain] = useState<string>('');\n  const [showPreview, setShowPreview] = useState<boolean>(false);"
  );
}

// Add Eye icon
if (!code.includes('Eye,')) {
  code = code.replace(
    "} from 'lucide-react';",
    "  Eye,\n} from 'lucide-react';"
  );
}

fs.writeFileSync('gfg-main/src/pages/Campaigns.tsx', code);
console.log('patched header Campaigns.tsx');
