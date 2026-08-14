const fs = require('fs');
let code = fs.readFileSync('routes/campaigns.js', 'utf8');

// Replace all occurrences
code = code.replaceAll(
  "INSERT INTO campaign_steps (campaign_id, step_number, subject, body_html, body_plain, delay_seconds)",
  "INSERT INTO campaign_steps (campaign_id, step_number, subject, body_html, body_plain, delay_seconds, trigger_event)"
);
code = code.replaceAll(
  "VALUES (?, ?, ?, ?, ?, ?)",
  "VALUES (?, ?, ?, ?, ?, ?, ?)"
);
code = code.replaceAll(
  "step.delay_seconds || 86400);",
  "step.delay_seconds || 86400, step.trigger_event || 'wait');"
);

fs.writeFileSync('routes/campaigns.js', code);
console.log('patched routes/campaigns.js twice');
