const fs = require('fs');
const file = 'gfg-main/src/pages/Campaigns.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('const [showPreview, setShowPreview]')) {
  // Add state
  code = code.replace(
    "const [bodyPlain, setBodyPlain] = useState<string>('');",
    "const [bodyPlain, setBodyPlain] = useState<string>('');\n  const [showPreview, setShowPreview] = useState<boolean>(false);"
  );
  
  // Add Eye icon to lucide-react if missing
  if (!code.includes('Eye,')) {
    code = code.replace(
      "} from 'lucide-react';",
      "  Eye,\n} from 'lucide-react';"
    );
  }

  // Replace textarea block with a toggle and preview
  const oldTextarea = /<textarea[\s\S]*?value=\{bodyHtml\}[\s\S]*?onChange=\{e => setBodyHtml\(e\.target\.value\)\}[\s\S]*?\/>/;
  
  const newHTMLInput = `
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase">HTML Body</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => setShowPreview(!showPreview)}
                          className="h-6 text-[10px] text-muted-foreground flex items-center gap-1 hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {showPreview ? 'Hide Preview' : 'Show Preview'}
                        </Button>
                      </div>
                      <div className={\`grid \${showPreview ? 'grid-cols-2 gap-4' : 'grid-cols-1'} items-start\`}>
                        <textarea
                          placeholder="<h2>Hello!</h2><p>Writing regarding your outreach...</p>"
                          value={bodyHtml}
                          onChange={e => setBodyHtml(e.target.value)}
                          className="w-full bg-background text-xs rounded-xl border border-input p-3 min-h-[160px] font-mono focus:ring-1 focus:ring-primary"
                        />
                        {showPreview && (
                          <div className="w-full min-h-[160px] bg-white text-black p-4 rounded-xl border border-border/60 overflow-y-auto" style={{ maxHeight: '200px' }}>
                            <div dangerouslySetInnerHTML={{ __html: bodyHtml || '<p style="color:#666;font-style:italic">No HTML content yet...</p>' }} />
                          </div>
                        )}
                      </div>`;
                      
  // Wait, the "HTML Body" label is probably right above this textarea. Let's see how it looks.
}
