const fs = require('fs');
let code = fs.readFileSync('gfg-main/src/pages/Campaigns.tsx', 'utf8');

const marker = '                      ))}\n                    </div>\n                  </div>';

const workflowUI = `
                  {/* Campaign Workflow Builder */}
                  <div className="pt-6 border-t border-border/40 mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Automated Workflow</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Define a sequence of automated email steps triggered by specific events.</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        type="button" 
                        onClick={() => setWorkflowSteps([...workflowSteps, { id: Date.now(), trigger_event: 'wait', delay_seconds: 86400, subject: '', body_html: '' }])}
                        className="h-8 text-xs font-semibold gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Step
                      </Button>
                    </div>
                    
                    {workflowSteps.length > 0 && (
                      <div className="space-y-4">
                        {workflowSteps.map((step, index) => (
                          <div key={step.id} className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3 relative">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              type="button"
                              onClick={() => setWorkflowSteps(workflowSteps.filter(s => s.id !== step.id))}
                              className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                              <span className="bg-primary/20 text-primary h-5 w-5 rounded-full flex items-center justify-center">{index + 2}</span>
                              Follow-up Step
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Trigger Event</label>
                                <select
                                  value={step.trigger_event}
                                  onChange={(e) => {
                                    const newSteps = [...workflowSteps];
                                    newSteps[index].trigger_event = e.target.value;
                                    setWorkflowSteps(newSteps);
                                  }}
                                  className="w-full bg-background text-xs rounded-lg border border-input p-2 outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value="wait">Wait Time (No Action)</option>
                                  <option value="opened">If Email Opened</option>
                                  <option value="clicked">If Link Clicked</option>
                                  <option value="unopened">If Not Opened</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Wait Duration</label>
                                <select
                                  value={step.delay_seconds}
                                  onChange={(e) => {
                                    const newSteps = [...workflowSteps];
                                    newSteps[index].delay_seconds = Number(e.target.value);
                                    setWorkflowSteps(newSteps);
                                  }}
                                  className="w-full bg-background text-xs rounded-lg border border-input p-2 outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value={3600}>1 Hour</option>
                                  <option value={86400}>1 Day</option>
                                  <option value={172800}>2 Days</option>
                                  <option value={259200}>3 Days</option>
                                  <option value={604800}>7 Days</option>
                                </select>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">Subject Line</label>
                              <input 
                                type="text"
                                placeholder="Re: Following up..."
                                value={step.subject}
                                onChange={(e) => {
                                  const newSteps = [...workflowSteps];
                                  newSteps[index].subject = e.target.value;
                                  setWorkflowSteps(newSteps);
                                }}
                                className="w-full bg-background text-xs rounded-lg border border-input p-2 outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">HTML Body</label>
                              <textarea 
                                placeholder="Just checking in..."
                                value={step.body_html}
                                onChange={(e) => {
                                  const newSteps = [...workflowSteps];
                                  newSteps[index].body_html = e.target.value;
                                  setWorkflowSteps(newSteps);
                                }}
                                className="w-full bg-background text-xs rounded-lg border border-input p-2 min-h-[80px] font-mono focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>`;

if (code.includes(marker)) {
  code = code.replace(marker, marker + "\n" + workflowUI);
  
  if (!code.includes('const [workflowSteps, setWorkflowSteps]')) {
    code = code.replace(
      "const [showPreview, setShowPreview] = useState<boolean>(false);",
      "const [showPreview, setShowPreview] = useState<boolean>(false);\n  const [workflowSteps, setWorkflowSteps] = useState<{ id: number; trigger_event: string; delay_seconds: number; subject: string; body_html: string }[]>([]);"
    );
    
    code = code.replace(
      "ignore_window: ignoreWindow ? 1 : 0,",
      "ignore_window: ignoreWindow ? 1 : 0,\n          steps: workflowSteps.map((s, idx) => ({ step_number: idx + 2, subject: s.subject, body_html: s.body_html, delay_seconds: s.delay_seconds, trigger_event: s.trigger_event })),"
    );
    
    code = code.replace(
      "setVariations([{ subject: '', body_html: '' }]);",
      "setVariations([{ subject: '', body_html: '' }]);\n        setWorkflowSteps([]);"
    );
  }
  
  fs.writeFileSync('gfg-main/src/pages/Campaigns.tsx', code);
  console.log('injected workflow UI');
} else {
  console.log('marker not found');
}
