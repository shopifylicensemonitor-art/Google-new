const fs = require('fs');
let code = fs.readFileSync('gfg-main/src/api.ts', 'utf8');

if (!code.includes('recent_logs:')) {
  code = code.replace(
    "chartData: {\n      date: string;\n      sent: number;\n      failed: number;\n    }[];",
    "chartData: {\n      date: string;\n      sent: number;\n      failed: number;\n    }[];\n    recent_logs: any[];"
  );
}

if (!code.includes('getInboxSentiment:')) {
  code = code.replace(
    "getInboxMessages: (limit?: number) => apiFetch<InboxMessage[]>(`/api/inbox?limit=${limit || 50}`),",
    "getInboxMessages: (limit?: number) => apiFetch<InboxMessage[]>(`/api/inbox?limit=${limit || 50}`),\n  getInboxSentiment: () => apiFetch<{ summary: string }>('/api/inbox/sentiment'),"
  );
}

fs.writeFileSync('gfg-main/src/api.ts', code);
console.log('patched api.ts');
