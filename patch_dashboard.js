const fs = require('fs');
const file = 'gfg-main/src/pages/Dashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add import
if (!code.includes('UsageSummaryChart')) {
  code = code.replace(
    "import { useUI } from '@/context/UIContext';",
    "import { useUI } from '@/context/UIContext';\nimport { UsageSummaryChart } from '@/components/UsageSummaryChart';"
  );
}

// 2. Add chartData to serverData state
if (!code.includes('chartData: {')) {
  code = code.replace(
    "status: string;\n    }[];",
    "status: string;\n    }[];\n    chartData: {\n      date: string;\n      sent: number;\n      failed: number;\n    }[];"
  );
}

// 3. Add chart to JSX
// I'll insert it right after the grid closing tag.
// "        </div>" after the metric cards (around line 280)
// Let's use a regex to find the closing div of the grid.
// Wait, the grid contains Needs Attention and Metrics.
const insertionPoint = `          </div>\n        </div>\n\n        {/* Usage Summary Chart */}`;
const chartJSX = `        {/* Usage Summary Chart */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Usage Summary</h2>
              <p className="text-xs text-muted-foreground mt-1">Daily email outreach volume over the last 7 days.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          {serverData?.chartData ? (
            <UsageSummaryChart data={serverData.chartData} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              Loading chart data...
            </div>
          )}
        </div>\n`;

code = code.replace("          </div>\n        </div>", "          </div>\n        </div>\n\n" + chartJSX);

fs.writeFileSync(file, code);
console.log('patched Dashboard.tsx');
