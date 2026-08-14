const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const replacement = `
    const campaigns = await db.prepare(\`
      SELECT c.*,
             COALESCE(SUM(q.opens_count), 0) as total_opens,
             COALESCE(SUM(q.clicks_count), 0) as total_clicks
      FROM campaigns c
      LEFT JOIN queue q ON c.id = q.campaign_id
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.id DESC
      LIMIT 5
    \`).all(uid);

    const queue = await db.prepare(\`
      SELECT q.*, c.name as campaign_name, a.email as account_email
      FROM queue q
      JOIN campaigns c ON q.campaign_id = c.id
      LEFT JOIN accounts a ON q.account_id = a.id
      WHERE c.user_id = ?
      ORDER BY q.id DESC
      LIMIT 10
    \`).all(uid);

    // Fetch recent logs
    const recent_logs = await db.prepare(\`
      SELECT l.*, c.name as campaign_name
      FROM logs l
      LEFT JOIN campaigns c ON l.campaign_id = c.id
      ORDER BY l.created_at DESC
      LIMIT 10
    \`).all();
`;

code = code.replace(/const campaigns = await db\.prepare\([\s\S]*?LIMIT 10\s*\`\)\.all\(uid\);/, replacement);
code = code.replace(/res\.json\(\{ stats, campaigns, queue, chartData: Object\.values\(chartData\) \}\);/, "res.json({ stats, campaigns, queue, chartData: Object.values(chartData), recent_logs });");

fs.writeFileSync('app.js', code);
console.log('patched app.js for recent_logs');
