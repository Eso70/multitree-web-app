const { spawn } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const port = 4010;
const baseUrl = `http://127.0.0.1:${port}`;
const adminToken = 'communication-e2e-platform-token';
const businessToken = 'communication-e2e-business-token';

async function waitUntilReady() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/public/platform-theme`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Temporary backend did not become ready');
}

async function main() {
  const server = spawn(process.execPath, ['dist/src/main.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(port) },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverLog = '';
  server.stdout.on('data', (chunk) => {
    serverLog += String(chunk);
  });
  server.stderr.on('data', (chunk) => {
    serverLog += String(chunk);
  });

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'multitree',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });
  const client = await pool.connect();
  let announcementId;
  let conversationId;
  try {
    await waitUntilReady();
    const admin = (await client.query('SELECT id FROM platform_admins LIMIT 1'))
      .rows[0];
    const business = (
      await client.query(
        "SELECT id, subdomain FROM businesses WHERE status='active' ORDER BY created_at LIMIT 1",
      )
    ).rows[0];
    if (!admin || !business) {
      throw new Error('An admin and active business are required');
    }
    await client.query(
      `INSERT INTO platform_admin_sessions
        (platform_admin_id, session_token, session_expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
       ON CONFLICT (session_token) DO NOTHING`,
      [admin.id, adminToken],
    );
    await client.query(
      `INSERT INTO business_sessions
        (business_id, session_token, session_expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
       ON CONFLICT (session_token) DO NOTHING`,
      [business.id, businessToken],
    );

    const request = async (url, role, init = {}) => {
      const response = await fetch(`${baseUrl}${url}`, {
        ...init,
        headers: {
          ...(init.body ? { 'content-type': 'application/json' } : {}),
          cookie:
            role === 'platform'
              ? `platform_admin_session=${adminToken}`
              : `business_session=${businessToken}`,
          ...(role === 'business' ? { 'x-subdomain': business.subdomain } : {}),
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          `${init.method || 'GET'} ${url}: ${response.status} ${JSON.stringify(payload)}`,
        );
      }
      return payload.data;
    };

    const announcement = await request(
      '/api/platform/communications/announcements',
      'platform',
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Communication E2E verification',
          message: 'Scoped delivery verification',
          announcementType: 'feature',
          priority: 'important',
          audienceType: 'businesses',
          audienceValues: [business.id],
          channels: ['business_bell', 'dashboard_banner', 'homepage'],
          ctaLabel: 'Open dashboard',
          ctaUrl: '/business',
          homepagePlacement: 'top_banner',
          homepagePriority: 50,
          homepageDismissible: true,
        }),
      },
    );
    announcementId = announcement.id;
    await request(
      `/api/platform/communications/announcements/${announcementId}/publish`,
      'platform',
      { method: 'POST', body: '{}' },
    );
    const businessInbox = await request(
      '/api/auth/communications/notifications',
      'business',
    );
    const homepage = await request(
      '/api/public/communications/homepage',
      'platform',
    );
    const conversation = await request(
      '/api/auth/communications/conversations',
      'business',
      {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Communication E2E thread',
          category: 'technical',
          message: 'Business to platform verification',
        }),
      },
    );
    conversationId = conversation.id;
    const platformThreads = await request(
      '/api/platform/communications/conversations',
      'platform',
    );
    await request(
      `/api/platform/communications/conversations/${conversationId}/messages`,
      'platform',
      {
        method: 'POST',
        body: JSON.stringify({ message: 'Platform reply verification' }),
      },
    );
    const finalBusinessInbox = await request(
      '/api/auth/communications/notifications',
      'business',
    );
    await request(
      `/api/platform/communications/announcements/${announcementId}`,
      'platform',
      { method: 'DELETE' },
    );

    const checks = {
      announcementPublished: businessInbox.items.some(
        (item) => item.sourceId === announcementId,
      ),
      homepageVisible: homepage.some((item) => item.id === announcementId),
      conversationVisible: platformThreads.some(
        (item) => item.id === conversationId,
      ),
      replyDelivered: finalBusinessInbox.items.some(
        (item) => item.sourceId === conversationId,
      ),
      archiveSucceeded: true,
    };
    if (Object.values(checks).some((value) => !value)) {
      throw new Error(`Smoke checks failed: ${JSON.stringify(checks)}`);
    }
    console.log(JSON.stringify(checks));
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const relevantLog = serverLog
      .split(/\r?\n/)
      .filter((line) =>
        /error|database query|communication_|conversation/i.test(line),
      )
      .slice(-40)
      .join('\n');
    console.error(relevantLog || serverLog.slice(-4000));
    throw error;
  } finally {
    if (announcementId) {
      await client.query(
        'DELETE FROM communication_notifications WHERE source_id=$1::uuid',
        [announcementId],
      );
      await client.query(
        'DELETE FROM communication_announcements WHERE id=$1::uuid',
        [announcementId],
      );
    }
    if (conversationId) {
      await client.query(
        'DELETE FROM communication_notifications WHERE source_id=$1::uuid',
        [conversationId],
      );
      await client.query(
        'DELETE FROM communication_conversations WHERE id=$1::uuid',
        [conversationId],
      );
    }
    await client.query(
      'DELETE FROM platform_admin_sessions WHERE session_token=$1',
      [adminToken],
    );
    await client.query('DELETE FROM business_sessions WHERE session_token=$1', [
      businessToken,
    ]);
    client.release();
    await pool.end();
    server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
