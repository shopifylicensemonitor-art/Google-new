const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const regex = /const d = new Date\(\);\s+d\.setDate\(d\.getDate\(\) - 7\);\s+const sevenDaysAgo = d\.toISOString\(\);\s+const logs = await db\.prepare\([\s\S]*?res\.json\(\{ stats, campaigns, queue, chartData: Object\.values\(chartData\) \}\);/m;

const replacement = `
    const days = parseInt(req.query.days) || 7;
    const d = new Date();
    d.setDate(d.getDate() - days);
    const startDate = d.toISOString();
    const logs = await db.prepare(
      "SELECT status, created_at FROM logs l JOIN campaigns c ON l.campaign_id = c.id WHERE c.user_id = ? AND l.created_at >= ?"
    ).all(uid, startDate);

    // Group logs by day
    const chartData = {};
    for (let i = days - 1; i >= 0; i--) {
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

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('app.js', code);
  console.log('patched app.js successfully.');
} else {
  console.log('regex did not match.');
}
