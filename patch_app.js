const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const newCode = `
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const sevenDaysAgo = d.toISOString();
    const logs = await db.prepare(
      "SELECT status, created_at FROM logs l JOIN campaigns c ON l.campaign_id = c.id WHERE c.user_id = ? AND l.created_at >= ?"
    ).all(uid, sevenDaysAgo);

    // Group logs by day
    const chartData = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const label = date.toISOString().split('T')[0];
      chartData[label] = { date: label, sent: 0, failed: 0 };
    }

    logs.forEach(log => {
      const day = new Date(log.created_at).toISOString().split('T')[0];
      if (chartData[day]) {
        if (log.status === 'sent') chartData[day].sent++;
        if (log.status === 'failed' || log.status === 'error') chartData[day].failed++;
      }
    });

    res.json({ stats, campaigns, queue, chartData: Object.values(chartData) });
`;

code = code.replace('res.json({ stats, campaigns, queue });', newCode);
fs.writeFileSync('app.js', code);
console.log('patched app.js');
