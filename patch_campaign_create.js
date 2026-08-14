const fs = require('fs');
let code = fs.readFileSync('gfg-main/src/pages/Campaigns.tsx', 'utf8');

// I want to make sure the payload format sends the 'trigger_event' and 'delay_seconds'
if (!code.includes('trigger_event: s.trigger_event')) {
    console.log("Not found in file.");
} else {
    console.log("Payload correctly format: " + !!code.includes('trigger_event: s.trigger_event'));
}
