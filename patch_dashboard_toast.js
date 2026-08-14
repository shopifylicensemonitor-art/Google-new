const fs = require('fs');
let code = fs.readFileSync('gfg-main/src/pages/Dashboard.tsx', 'utf8');

// 1. Toast logic
// Find useEffect that fetches data and add the toast logic after fetchDashboardData().finally()
const fetchEffectRegex = /fetchDashboardData\(\)\.finally\(\(\) => setLoading\(false\)\);/;
const toastLogic = `fetchDashboardData().finally(() => {
      setLoading(false);
      // Run toast checks
      api.getDashboardData().then(dash => {
        if (dash.stats.failed > 50 && dash.stats.failed > dash.stats.today_sent * 0.1) {
          toast({ variant: 'destructive', title: 'High Bounce Rate Detected', description: \`\${dash.stats.failed} emails have failed recently. Check your campaigns.\`});
        }
      });
      api.getAccounts().then(accs => {
        const disconnected = accs.find(a => a.status === 'disconnected' || a.status === 'error');
        if (disconnected) {
          toast({ variant: 'destructive', title: 'Gmail Auth Error', description: \`Account \${disconnected.email} is disconnected. Please re-authenticate.\` });
        }
      });
    });`;

if (code.includes('fetchDashboardData().finally(() => setLoading(false));')) {
  code = code.replace('fetchDashboardData().finally(() => setLoading(false));', toastLogic);
}

// 2. Fix Today's Activity Feed
const feedStart = '<div className="p-6 flex-1 flex flex-col gap-6">';
const feedEnd = '{/* Usage Summary Chart and Stats */}';

if (code.includes(feedStart) && code.includes(feedEnd)) {
  const parts = code.split(feedStart);
  const secondPart = parts[1];
  const feedEndIndex = secondPart.indexOf('</div>\n          </div>\n\n          {/* Usage Summary Chart and Stats */}');
  
  if (feedEndIndex !== -1) {
    // Wait, earlier I moved Usage Summary above Campaign Queue Status.
    // Let me find the exact end of the Activity feed div.
  }
}

fs.writeFileSync('gfg-main/src/pages/Dashboard.tsx', code);
console.log('patched dashboard toast');
