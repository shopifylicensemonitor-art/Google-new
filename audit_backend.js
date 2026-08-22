const app = require('./app');
const http = require('http');

const server = http.createServer(app);
server.listen(0, async () => {
  const port = server.address().port;
  const base = 'http://127.0.0.1:' + port;
  console.log('\n======================================================');
  console.log('         FULL BACKEND HEALTH & ENDPOINT AUDIT         ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log('  [PASS] ' + name);
      passed++;
    } catch (err) {
      console.error('  [FAIL] ' + name + ' -> ' + err.message);
      failed++;
    }
  }

  try {
    // 1. PIN Login
    let token = '';
    await check('POST /api/auth/pin-login', async () => {
      const res = await fetch(base + '/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: process.env.ACCESS_PIN || '123456' })
      });
      const data = await res.json();
      if (!res.ok || !data.token) throw new Error('Status ' + res.status + ': ' + (data.error || 'No token'));
      token = data.token;
    });

    const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

    // 2. Health Check
    await check('GET /api/health', async () => {
      const res = await fetch(base + '/api/health');
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    // 3. Auth Me
    await check('GET /api/auth/me', async () => {
      const res = await fetch(base + '/api/auth/me', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    // 4. Auth Settings
    await check('GET /api/auth/settings', async () => {
      const res = await fetch(base + '/api/auth/settings', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    // 5. Auth Reset Code Status
    await check('GET /api/auth/reset-code', async () => {
      const res = await fetch(base + '/api/auth/reset-code', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    // 6. Accounts List
    await check('GET /api/accounts', async () => {
      const res = await fetch(base + '/api/accounts', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    // 7. Accounts Auth-URL
    await check('POST /api/accounts/auth-url', async () => {
      const res = await fetch(base + '/api/accounts/auth-url', { method: 'POST', headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    // 8. Campaigns List
    await check('GET /api/campaigns', async () => {
      const res = await fetch(base + '/api/campaigns', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    // 9. Campaign Create & Lifecycle
    let testCampaignId = null;
    await check('POST /api/campaigns (Create Draft)', async () => {
      const res = await fetch(base + '/api/campaigns', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'Backend Audit Test Campaign',
          subject: 'Hello World',
          body_html: '<p>Test</p>',
          body_plain: 'Test',
          contact_list: 'audit-test-list',
          delay_seconds: 60,
          start_time: '09:00',
          end_time: '18:00'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.id) throw new Error('Status ' + res.status + ': ' + (data.error || 'No id'));
      testCampaignId = data.id;
    });

    if (testCampaignId) {
      await check('GET /api/campaigns/:id', async () => {
        const res = await fetch(base + '/api/campaigns/' + testCampaignId, { headers });
        if (!res.ok) throw new Error('Status ' + res.status);
      });

      await check('PUT /api/campaigns/:id', async () => {
        const res = await fetch(base + '/api/campaigns/' + testCampaignId, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ name: 'Backend Audit Test Campaign (Updated)' })
        });
        if (!res.ok) throw new Error('Status ' + res.status);
      });

      await check('GET /api/campaigns/:id/recipients', async () => {
        const res = await fetch(base + '/api/campaigns/' + testCampaignId + '/recipients', { headers });
        if (!res.ok) throw new Error('Status ' + res.status);
      });

      await check('DELETE /api/campaigns/:id', async () => {
        const res = await fetch(base + '/api/campaigns/' + testCampaignId, { method: 'DELETE', headers });
        if (!res.ok) throw new Error('Status ' + res.status);
      });
    }

    // 10. Contacts List & CRUD
    await check('POST /api/contacts (Add single contact)', async () => {
      const res = await fetch(base + '/api/contacts', {
        method: 'POST',
        headers,
        body: JSON.stringify({ list_name: 'test-audit-list', email: 'audit_prospect@test.com' })
      });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    await check('GET /api/contacts/lists', async () => {
      const res = await fetch(base + '/api/contacts/lists', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    await check('GET /api/contacts/:listName', async () => {
      const res = await fetch(base + '/api/contacts/test-audit-list', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    await check('GET /api/contacts/history/:email', async () => {
      const res = await fetch(base + '/api/contacts/history/audit_prospect%40test.com', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    await check('POST /api/contacts/state/save & retrieve', async () => {
      const saveRes = await fetch(base + '/api/contacts/state/save', {
        method: 'POST',
        headers,
        body: JSON.stringify({ device_id: 'test-dev-123', state_data: { test: true } })
      });
      if (!saveRes.ok) throw new Error('Save status ' + saveRes.status);

      const getRes = await fetch(base + '/api/contacts/state/retrieve?device_id=test-dev-123', { headers });
      if (!getRes.ok) throw new Error('Retrieve status ' + getRes.status);
    });

    await check('DELETE /api/contacts/:listName', async () => {
      const res = await fetch(base + '/api/contacts/test-audit-list', { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    // 11. Templates CRUD
    let testTemplateId = null;
    await check('POST /api/templates', async () => {
      const res = await fetch(base + '/api/templates', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Audit Template', subject: 'Subject', body_html: '<p>Body</p>', body_plain: 'Body' })
      });
      const data = await res.json();
      if (!res.ok || !data.id) throw new Error('Status ' + res.status);
      testTemplateId = data.id;
    });

    await check('GET /api/templates', async () => {
      const res = await fetch(base + '/api/templates', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    if (testTemplateId) {
      await check('GET /api/templates/:id', async () => {
        const res = await fetch(base + '/api/templates/' + testTemplateId, { headers });
        if (!res.ok) throw new Error('Status ' + res.status);
      });

      await check('DELETE /api/templates/:id', async () => {
        const res = await fetch(base + '/api/templates/' + testTemplateId, { method: 'DELETE', headers });
        if (!res.ok) throw new Error('Status ' + res.status);
      });
    }

    // 12. Suppression List
    let testSuppressionId = null;
    await check('POST /api/suppression', async () => {
      const res = await fetch(base + '/api/suppression', {
        method: 'POST',
        headers,
        body: JSON.stringify({ value: 'blocked_user@spam.com', type: 'email', reason: 'audit_test' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Status ' + res.status);
      testSuppressionId = data.id;
    });

    await check('GET /api/suppression', async () => {
      const res = await fetch(base + '/api/suppression', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    await check('GET /api/suppression/stats', async () => {
      const res = await fetch(base + '/api/suppression/stats', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    if (testSuppressionId) {
      await check('DELETE /api/suppression/:id', async () => {
        const res = await fetch(base + '/api/suppression/' + testSuppressionId, { method: 'DELETE', headers });
        if (!res.ok) throw new Error('Status ' + res.status);
      });
    }

    // 13. AI Configuration & Rules
    await check('GET /api/ai/configs', async () => {
      const res = await fetch(base + '/api/ai/configs', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    await check('GET /api/ai/config', async () => {
      const res = await fetch(base + '/api/ai/config', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    await check('GET /api/ai/rules', async () => {
      const res = await fetch(base + '/api/ai/rules', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    await check('POST /api/ai/rules', async () => {
      const res = await fetch(base + '/api/ai/rules', {
        method: 'POST',
        headers,
        body: JSON.stringify({ rules: { initial: 'You are an outreach expert.' } })
      });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    // 14. Inbox
    await check('GET /api/inbox/counts', async () => {
      const res = await fetch(base + '/api/inbox/counts', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    await check('GET /api/inbox', async () => {
      const res = await fetch(base + '/api/inbox', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    // 15. Queue & Worker Status
    await check('GET /api/queue/worker/status', async () => {
      const res = await fetch(base + '/api/queue/worker/status', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    await check('GET /api/queue/logs/recent', async () => {
      const res = await fetch(base + '/api/queue/logs/recent', { headers });
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    // 16. Tracking (Open Pixel)
    await check('GET /api/track/open/1 (Public Tracking Pixel)', async () => {
      const res = await fetch(base + '/api/track/open/1');
      if (!res.ok) throw new Error('Status ' + res.status);
    });

    console.log('\n======================================================');
    console.log(' AUDIT COMPLETE: ' + passed + ' PASSED, ' + failed + ' FAILED');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Fatal audit error:', err);
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
});
