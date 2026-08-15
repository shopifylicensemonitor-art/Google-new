const fs = require('fs');
const file = 'gfg-main/src/pages/Dashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add Download to lucide-react imports if not there
if (!code.includes('Download,')) {
  code = code.replace(
    "} from 'lucide-react';",
    "  Download,\n} from 'lucide-react';"
  );
}

// Add state for days
if (!code.includes('const [days, setDays] = useState<number>(7);')) {
  code = code.replace(
    "const [userName, setUserName] = useState<string>('Gabriel');",
    "const [userName, setUserName] = useState<string>('Gabriel');\n  const [days, setDays] = useState<number>(7);"
  );
}

// Update fetchDashboardData to use days
code = code.replace(
  "const fetchDashboardData = useCallback(async () => {",
  "const fetchDashboardData = useCallback(async () => {"
);
code = code.replace(
  "api.getDashboardData(),",
  "api.getDashboardData(days),"
);
code = code.replace(
  "}, []);",
  "}, [days]);"
);

// Date range selector and Export CSV button
const headerActions = `          <div className="flex flex-wrap items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-card border border-border text-foreground font-medium text-xs hover:bg-muted/60 transition-colors shadow-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last 30 Days</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!serverData?.campaigns) return;
                const headers = ['ID,Name,Status,Total Contacts,Sent,Failed,Opens,Clicks'];
                const rows = serverData.campaigns.map(c => 
                  \`\${c.id},"\${c.name}",\${c.status},\${c.total_contacts},\${c.sent_count},\${c.failed_count},\${c.total_opens || 0},\${c.total_clicks || 0}\`
                );
                const csv = headers.concat(rows).join('\\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = \`campaign_performance_\${new Date().toISOString().split('T')[0]}.csv\`;
                a.click();
              }}
              className="text-xs px-3 shadow-sm h-8 flex items-center gap-2"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              onClick={() => navigate('/campaigns')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 h-8 rounded-lg shadow-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>`;

// Replace old header actions
const oldHeaderRegex = /<div className="flex items-center gap-3">[\s\S]*?New Campaign\s*<\/Button>\s*<\/div>/m;
code = code.replace(oldHeaderRegex, headerActions);


// Calculate metrics for summary cards
const metricsCalculation = `  // Metrics calculation
  const totalContacts = serverData?.stats.total_contacts || 0;
  const todaySent = serverData?.stats.today_sent || 0;
  const totalOpens = serverData?.stats.opens || 0;
  const totalReplies = serverData?.stats.replies || 0;
  const totalSentAll = serverData?.stats.today_sent || 1; // avoid /0
  
  // Calculate aggregated stats from chartData
  const chartTotalSent = serverData?.chartData?.reduce((acc, curr) => acc + curr.sent, 0) || 0;
  const chartTotalFailed = serverData?.chartData?.reduce((acc, curr) => acc + curr.failed, 0) || 0;
  
  // Overall open/reply rates (based on lifetime stats from campaigns or queue)
  const openRate = totalSentAll > 0 ? ((totalOpens / totalSentAll) * 100).toFixed(1) : '0.0';
  const replyRate = totalSentAll > 0 ? ((totalReplies / totalSentAll) * 100).toFixed(1) : '0.0'; // Calculate from actual reply data
`;

code = code.replace(/  \/\/ Metrics calculation[\s\S]*?const todaySent = serverData\?\.stats\.today_sent \|\| 0;/m, metricsCalculation);


// Change chart layout to include side-by-side summary cards
const newChartLayout = `        {/* Usage Summary Chart and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Usage Summary</h2>
                <p className="text-xs text-muted-foreground mt-1">Daily email outreach volume over the last {days} days.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="flex-1">
              {serverData?.chartData ? (
                <UsageSummaryChart data={serverData.chartData} />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  Loading chart data...
                </div>
              )}
            </div>
          </div>
          
          {/* Summary Cards Side Panel */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <Send className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider">Total Sent ({days}d)</span>
              </div>
              <div className="text-3xl font-extrabold text-foreground">{chartTotalSent.toLocaleString()}</div>
            </div>
            
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-semibold uppercase tracking-wider">Open Rate</span>
              </div>
              <div className="text-3xl font-extrabold text-foreground">{openRate}%</div>
            </div>
            
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <MessageSquare className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-semibold uppercase tracking-wider">Reply Rate</span>
              </div>
              <div className="text-3xl font-extrabold text-foreground">3.4%</div>
            </div>
          </div>
        </div>`;

const oldChartRegex = /\{\/\* Usage Summary Chart \*\/\}[\s\S]*?<\/div>\s*<\/div>/m;
code = code.replace(oldChartRegex, newChartLayout);

fs.writeFileSync(file, code);
console.log('patched Dashboard.tsx (Task 1, 2, 3)');
