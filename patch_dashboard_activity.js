const fs = require('fs');
let code = fs.readFileSync('gfg-main/src/pages/Dashboard.tsx', 'utf8');

// Replace the hardcoded Feed Items with real logs
const activityRegex = /<div className="p-6 flex-1 flex flex-col gap-6">[\s\S]*?\{\/\* Metric: Total Contacts \*\/\}/m;

const newActivityBlock = `<div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto max-h-[400px]">
              {!serverData?.recent_logs || serverData.recent_logs.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-8">No recent activity.</div>
              ) : (
                serverData.recent_logs.map((log, idx) => (
                  <div key={log.id || idx} className="flex gap-4 relative">
                    {idx !== serverData.recent_logs.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-[-24px] w-[1px] bg-border/60" />
                    )}
                    <div className={\`z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 border \${
                      log.status === 'sent' 
                        ? 'bg-primary/10 text-primary border-primary/20' 
                        : log.status === 'failed' || log.status === 'error'
                          ? 'bg-destructive/10 text-destructive border-destructive/20'
                          : 'bg-muted text-muted-foreground border-border'
                    }\`}>
                      {log.status === 'sent' ? <CheckCircle2 className="h-4 w-4" /> : log.status === 'failed' || log.status === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                    </div>
                    <div className="pt-0.5">
                      <p className="text-xs font-semibold text-foreground capitalize">{log.status} Event</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.message || \`Email \${log.status} to \${log.recipient_email || 'unknown'}\`} {log.campaign_name ? \`in '\${log.campaign_name}'\` : ''}
                      </p>
                      <span className="text-[10px] text-muted-foreground/70 font-mono block mt-1">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Metrics Section (Span 1) - Let's just adjust the UI layout if needed, wait the metrics were replaced? No, earlier metrics were lg:col-span-1. */}
          {/* Oh wait, my regex replaced too much maybe. Let me just replace the Today's Activity div. */}
`;

// I'll be more precise.
const specificRegex = /<div className="p-6 flex-1 flex flex-col gap-6">[\s\S]*?<\/div>\s*<\/div>\s*\{\/\* Metric: Total Contacts \*\/\}/m;
// Let's use string manipulation instead to be safer.
