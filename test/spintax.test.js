const test = require('node:test');
const assert = require('node:assert/strict');
const { parseSpintax } = require('../execution/spintax');
const { personalise } = require('../scheduler');

test('parses simple word spintax', () => {
  const input = '{Hello|Hi|Hey} John';
  const out = parseSpintax(input);
  assert.match(out, /^(Hello|Hi|Hey) John$/);
});

test('parses sentence-level spintax with punctuation and spacing', () => {
  const input = '{I noticed your product and wanted to say hello.|Loved your recent update and wanted to connect.|Quick question regarding your workflow.}';
  const out = parseSpintax(input);
  const valid = [
    'I noticed your product and wanted to say hello.',
    'Loved your recent update and wanted to connect.',
    'Quick question regarding your workflow.'
  ];
  assert.ok(valid.includes(out), `Unexpected output: ${out}`);
});

test('parses sentence-level spintax containing embedded variables', () => {
  const input = '{Hi {{first_name}}, I saw what you built at {{company}}.|Hello {{first_name}}, reaching out regarding {{company}} outreach.}';
  const out = parseSpintax(input);
  const valid1 = 'Hi {{first_name}}, I saw what you built at {{company}}.';
  const valid2 = 'Hello {{first_name}}, reaching out regarding {{company}} outreach.';
  assert.ok(out === valid1 || out === valid2, `Unexpected output: ${out}`);
});

test('parses nested spintax across multiple lines', () => {
  const input = `{Good {morning|afternoon}|Greetings},\n\n{I hope your week is off to a great start.|Hope all is well on your end.}`;
  const out = parseSpintax(input);
  assert.match(out, /^(Good morning|Good afternoon|Greetings),\n\n(I hope your week is off to a great start\.|Hope all is well on your end\.)$/);
});

test('personalise resolves sentence spintax and dynamic contact fields together', () => {
  const template = '{Hi {{first_name}}, loved {{company}}.|Hello {{first_name}}, quick note regarding {{company}}.}';
  const recipient = 'alex@example.com';
  const fields = JSON.stringify({ first_name: 'Alex', company: 'Acme Corp' });

  const result = personalise(template, recipient, fields, 'Sarah');
  const valid1 = 'Hi Alex, loved Acme Corp.';
  const valid2 = 'Hello Alex, quick note regarding Acme Corp.';
  assert.ok(result === valid1 || result === valid2, `Unexpected personalise output: ${result}`);
});
