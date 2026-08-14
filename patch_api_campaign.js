const fs = require('fs');
let code = fs.readFileSync('gfg-main/src/api.ts', 'utf8');

if (!code.includes('trigger_event?: string;')) {
  code = code.replace(
    "delay_seconds: number;\n}",
    "delay_seconds: number;\n  trigger_event?: string;\n}"
  );
  fs.writeFileSync('gfg-main/src/api.ts', code);
  console.log('patched CampaignStep interface');
} else {
  console.log('already patched');
}
