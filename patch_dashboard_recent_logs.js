const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// I am going to try matching exactly what the app.js has to inject recent_logs.
const replaceCode = `    // Group logs by day
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

    // Fetch recent logs
    const recent_logs = await db.prepare(\`
      SELECT l.*, c.name as campaign_name
      FROM logs l
      LEFT JOIN campaigns c ON l.campaign_id = c.id
      WHERE c.user_id = ?
      ORDER BY l.created_at DESC
      LIMIT 10
    \`).all(uid);

    res.json({ stats, campaigns, queue, chartData: Object.values(chartData), recent_logs });
`;

if (code.includes('    // Group logs by day')) {
  // We need to replace the bottom half
  const parts = code.split('    // Group logs by day');
  const secondPart = parts[1];
  const endBracket = secondPart.indexOf('  } catch (err) {');
  
  if (endBracket !== -1) {
     const newCode = parts[0] + replaceCode + secondPart.substring(endBracket);
     fs.writeFileSync('app.js', newCode);
     console.log('patched recent_logs endpoint');
  }
}
