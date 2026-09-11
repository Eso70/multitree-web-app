import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie, { type FastifyCookieOptions } from '@fastify/cookie';
import type { FastifyPluginCallback } from 'fastify';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { RequestBoundaryPipe } from '../src/common/request-boundary.pipe';
import {
  isAuthenticatedMutation,
  isSameOriginBrowserRequest,
} from '../src/common/request-origin';
import { RedisService } from '../src/redis/redis.service';
import { SessionService } from '../src/auth/session.service';

const cookiePlugin = ((fastifyCookie as unknown as { default?: unknown })
  .default ?? fastifyCookie) as FastifyPluginCallback<FastifyCookieOptions>;

const BUSINESS_A_ID = '81000000-0000-4000-8000-000000000001';
const BUSINESS_B_ID = '81000000-0000-4000-8000-000000000002';
const ADMIN_ID = '81000000-0000-4000-8000-000000000003';
const ULTRA_PLAN_ID = '45fe1328-6fb2-4b91-9c30-fd51c3861027';
const ULTRA_CONFIGURATION_ID = '3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd';
const ULTRA_SUBSCRIPTION_PLAN_ID = '9e00fefd-0eba-4d41-bebd-41091e1bbb98';

type JsonRecord = Record<string, unknown>;

function assertDisposableDatabase(): void {
  const database = process.env.DB_NAME || '';
  if (!/(?:^|[_-])(e2e|test)(?:[_-]|$)/i.test(database)) {
    throw new Error(
      `Refusing to run destructive E2E fixtures against DB_NAME=${database || '<empty>'}`,
    );
  }
}

function poolConfig() {
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
}

function body(response: { json(): unknown }): JsonRecord {
  return response.json() as JsonRecord;
}

function data(response: { json(): unknown }): JsonRecord {
  return body(response).data as JsonRecord;
}

describe('critical architecture matrix (e2e)', () => {
  let app: NestFastifyApplication;
  let fixturePool: Pool;
  let businessACookie: string;
  let businessBCookie: string;

  beforeAll(async () => {
    assertDisposableDatabase();
    fixturePool = new Pool(poolConfig());
    await fixturePool.query(
      'DELETE FROM businesses WHERE id = ANY($1::uuid[])',
      [[BUSINESS_A_ID, BUSINESS_B_ID]],
    );
    await fixturePool.query('DELETE FROM platform_admins WHERE id=$1', [
      ADMIN_ID,
    ]);
    await fixturePool.query(
      `INSERT INTO businesses (id,username,name,phone,subdomain,status,plan,max_linktrees)
       VALUES
         ($1,'h8-tenant-a','H8 Tenant A','10001','h8-tenant-a','active','enterprise',20),
         ($2,'h8-tenant-b','H8 Tenant B','10002','h8-tenant-b','active','enterprise',20)`,
      [BUSINESS_A_ID, BUSINESS_B_ID],
    );
    await fixturePool.query(
      `INSERT INTO business_subscriptions
         (business_id,plan_id,plan_configuration_id,subscription_plan_id,status,billing_cycle,current_period_end)
       SELECT business_id,$2,$3,$4,'active','custom',now()+interval '30 days'
       FROM unnest($1::uuid[]) AS fixture(business_id)
       ON CONFLICT (business_id) DO UPDATE SET
         plan_id=EXCLUDED.plan_id,
         plan_configuration_id=EXCLUDED.plan_configuration_id,
         subscription_plan_id=EXCLUDED.subscription_plan_id,
         status='active',
         current_period_end=EXCLUDED.current_period_end`,
      [
        [BUSINESS_A_ID, BUSINESS_B_ID],
        ULTRA_PLAN_ID,
        ULTRA_CONFIGURATION_ID,
        ULTRA_SUBSCRIPTION_PLAN_ID,
      ],
    );
    await fixturePool.query(
      `INSERT INTO platform_admins (id,username,name)
       VALUES ($1,'h8-admin','H8 Administrator')`,
      [ADMIN_ID],
    );

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.register(cookiePlugin, {
      secret: process.env.SESSION_SECRET,
    });
    const fastify = app.getHttpAdapter().getInstance();
    fastify.addHook('preValidation', async (request, reply) => {
      if (
        isAuthenticatedMutation(request.method, request.cookies) &&
        !isSameOriginBrowserRequest(
          request.headers.origin,
          request.headers.referer,
          request.headers.host,
          request.headers['x-forwarded-proto'],
          request.protocol,
        )
      ) {
        return reply.code(403).send({ message: 'Invalid request origin' });
      }
    });
    app.useGlobalPipes(
      new RequestBoundaryPipe(),
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        validationError: { target: false, value: false },
      }),
    );
    await app.init();
    await fastify.ready();
    await app.get(RedisService).getClient().flushdb();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (fixturePool) {
      await fixturePool.query(
        'DELETE FROM businesses WHERE id = ANY($1::uuid[])',
        [[BUSINESS_A_ID, BUSINESS_B_ID]],
      );
      await fixturePool.query('DELETE FROM platform_admins WHERE id=$1', [
        ADMIN_ID,
      ]);
      await fixturePool.end();
    }
  });

  it('boots the real module and exposes production liveness', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/live' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'alive' });
  });

  // There is no password route to authenticate through: business owners sign
  // in with Google or a tenant-bound email code, and platform administrators
  // with Google or a root-domain email code. Both of those need a live Google
  // or SMTP round trip, so the fixture mints sessions through the same
  // `SessionService` the real endpoints use. The tokens are therefore produced
  // and stored exactly as production produces them, and every assertion below
  // still exercises the real guards, cookie binding, and tenant isolation.
  it('issues real sessions for both tenants and the separate platform domain', async () => {
    const sessions = app.get(SessionService);
    const context = { ipAddress: '127.0.0.1', userAgent: 'e2e' };

    const [tenantA, tenantB, platform] = await Promise.all([
      sessions.createBusinessSession({
        businessId: BUSINESS_A_ID,
        userId: null,
        ...context,
        sessionUser: {
          username: 'h8-tenant-a',
          name: 'H8 Tenant A',
          subdomain: 'h8-tenant-a',
        },
      }),
      sessions.createBusinessSession({
        businessId: BUSINESS_B_ID,
        userId: null,
        ...context,
        sessionUser: {
          username: 'h8-tenant-b',
          name: 'H8 Tenant B',
          subdomain: 'h8-tenant-b',
        },
      }),
      sessions.createPlatformAdminSession({
        platformAdminId: ADMIN_ID,
        username: 'h8-admin',
        name: 'H8 Administrator',
        ...context,
      }),
    ]);

    expect(tenantA.sessionToken).toBeTruthy();
    expect(tenantB.sessionToken).toBeTruthy();
    expect(platform.sessionToken).toBeTruthy();
    businessACookie = `business_session=${tenantA.sessionToken}`;
    businessBCookie = `business_session=${tenantB.sessionToken}`;
  });

  it('enforces cookie origin and tenant binding before controller work', async () => {
    const wrongOrigin = await app.inject({
      method: 'POST',
      url: '/api/linktrees',
      headers: {
        cookie: businessACookie,
        host: 'h8-tenant-a.localhost',
        origin: 'https://attacker.example',
        'x-subdomain': 'h8-tenant-a',
      },
      payload: { name: 'Blocked page', slug: 'blocked-page' },
    });
    const wrongTenant = await app.inject({
      method: 'GET',
      url: '/api/linktrees',
      headers: {
        cookie: businessACookie,
        'x-subdomain': 'h8-tenant-b',
      },
    });

    expect(wrongOrigin.statusCode).toBe(403);
    expect(wrongTenant.statusCode).toBe(401);
  });

  it('creates tenant-owned Linktrees and denies cross-tenant reads', async () => {
    const create = (cookie: string, subdomain: string, slug: string) =>
      app.inject({
        method: 'POST',
        url: '/api/linktrees',
        headers: {
          cookie,
          host: `${subdomain}.localhost`,
          origin: `http://${subdomain}.localhost`,
          'x-subdomain': subdomain,
        },
        payload: { name: `${subdomain} page`, slug },
      });
    const [tenantAPage, tenantBPage] = await Promise.all([
      create(businessACookie, 'h8-tenant-a', 'h8-a-page'),
      create(businessBCookie, 'h8-tenant-b', 'h8-b-page'),
    ]);
    expect(tenantAPage.statusCode).toBe(201);
    expect(tenantBPage.statusCode).toBe(201);

    const tenantBPageId = String(data(tenantBPage).id);
    const crossTenant = await app.inject({
      method: 'GET',
      url: `/api/linktrees/${tenantBPageId}`,
      headers: {
        cookie: businessACookie,
        host: 'h8-tenant-a.localhost',
        'x-subdomain': 'h8-tenant-a',
      },
    });
    expect(crossTenant.statusCode).toBe(404);
  });
});
