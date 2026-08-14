const fs = require('fs');
let code = fs.readFileSync('routes/campaigns.js', 'utf8');

code = code.replace(
  "INSERT INTO campaign_steps (campaign_id, step_number, subject, body_html, body_plain, delay_seconds)",
  "INSERT INTO campaign_steps (campaign_id, step_number, subject, body_html, body_plain, delay_seconds, trigger_event)"
);
code = code.replace(
  "VALUES (?, ?, ?, ?, ?, ?)",
  "VALUES (?, ?, ?, ?, ?, ?, ?)"
);
code = code.replace(
  "step.delay_seconds || 86400);",
  "step.delay_seconds || 86400, step.trigger_event || 'wait');"
);

// We need to replace it twice, once for post '/' and once for put '/:id'
// Wait, the replace string might not replace globally if not regex, but let's just do it with a quick script.
