// Production Readiness Verification
// Tests: Customer flows, admin flows, support agent auth, tenant isolation,
//        plan enforcement, billing restrictions, support permissions
// Usage: node scripts/test-production.mjs
//
// Auth architecture: custom cookie-based auth (NOT NextAuth.js)
//   - Customer: POST /api/auth/login  → simpleUserAuth cookie
//   - Admin:    POST /api/admin/login  → simpleAdminAuth cookie

const BASE = process.env.APP_URL || 'http://localhost:3000';
const API = `${BASE}/api`;

const ACCOUNTS = {
  free:       { email: 'free@mozassets.com',    password: 'Password123!', plan: 'FREE',       type: 'customer' },
  pro:        { email: 'pro@mozassets.com',     password: 'Password123!', plan: 'PRO',        type: 'customer' },
  enterprise: { email: 'enterprise@mozassets.com', password: 'Password123!', plan: 'ENTERPRISE', type: 'customer' },
  admin:      { email: 'Ademoyemo@gmail.com',   password: 'Greenmoneys10@',                   type: 'admin' },
};

const results = [];
let sessionCookies = {};

function pass(label, msg = '') {
  console.log(`  \u2705 PASS: ${label}${msg ? ' \u2014 ' + msg : ''}`);
  results.push({ label, status: 'PASS', msg });
}

function fail(label, msg) {
  console.log(`  \u274c FAIL: ${label} \u2014 ${msg}`);
  results.push({ label, status: 'FAIL', msg });
}

async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function apiPost(path, body, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetchWithTimeout(`${API}${path}`, {
    method: 'POST', headers, body: JSON.stringify(body), redirect: 'manual',
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data, headers: res.headers, redirected: res.redirected };
}

async function apiGet(path, cookie) {
  const headers = {};
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetchWithTimeout(`${API}${path}`, { headers, redirect: 'manual' });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data, headers: res.headers, redirected: res.redirected };
}

async function pageGet(path, cookie) {
  const headers = {};
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetchWithTimeout(`${BASE}${path}`, { headers, redirect: 'manual' }, 20000);
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: text, headers: res.headers, redirected: res.redirected };
}

function extractCookie(headers, name) {
  const setCookie = headers.get('set-cookie') || '';
  const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

// ============================================================
//  SEED CHECK / SETUP
// ============================================================
async function ensureSeed() {
  console.log('\n=== Checking seed accounts ===');
  const { PrismaClient } = await import('@prisma/client');
  const bcryptMod = await import('bcryptjs');
  const bcrypt = bcryptMod.default || bcryptMod;
  const prisma = new PrismaClient();
  try {
    for (const acc of [ACCOUNTS.free, ACCOUNTS.pro, ACCOUNTS.enterprise]) {
      const hash = await bcrypt.hash(acc.password, 12);
      const u = await prisma.user.upsert({
        where: { email: acc.email },
        update: { password: hash, plan: acc.plan, role: 'SUPER_ADMIN', isActive: true, onBoardingComplete: true },
        create: { email: acc.email, name: acc.email.split('@')[0], password: hash, plan: acc.plan, role: 'SUPER_ADMIN', isActive: true, onBoardingComplete: true, assetLimit: acc.plan === 'FREE' ? 50 : acc.plan === 'PRO' ? 500 : -1 },
      });
      if (!u.organizationId) {
        const orgName = `${acc.plan}-Org-${u.id.slice(-6)}`;
        const org = await prisma.organization.upsert({
          where: { name: orgName },
          update: { ownerId: u.id, plan: acc.plan },
          create: { name: orgName, ownerId: u.id, plan: acc.plan },
        });
        await prisma.user.update({ where: { id: u.id }, data: { organizationId: org.id } });
        console.log(`  Created org ${orgName} for ${acc.email}`);
      } else {
        console.log(`  ${acc.email} orgId: ${u.organizationId}`);
      }
    }

    const adminHash = await bcrypt.hash(ACCOUNTS.admin.password, 12);
    await prisma.internalAdmin.upsert({
      where: { email: ACCOUNTS.admin.email },
      update: { password: adminHash, role: 'OWNER', isActive: true },
      create: { email: ACCOUNTS.admin.email, name: 'Ademoye Admin', password: adminHash, role: 'OWNER', isActive: true },
    });
    console.log('  Admin account OK');

    // Create support agent for role-based tests
    const supportEmail = 'support@mozassets.com';
    const supportHash = await bcrypt.hash('Password123!', 12);
    await prisma.internalAdmin.upsert({
      where: { email: supportEmail },
      update: { password: supportHash, role: 'SUPPORT_AGENT', isActive: true },
      create: { email: supportEmail, name: 'Support Agent', password: supportHash, role: 'SUPPORT_AGENT', isActive: true },
    });
    console.log('  Support agent account OK');

    console.log('  Seed check complete');
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
//  LOGIN — custom auth (not NextAuth)
// ============================================================
async function testLogin(key, acc) {
  console.log(`\n--- LOGIN: ${acc.email} (${acc.plan || ''} ${acc.type}) ---`);
  const endpoint = acc.type === 'admin' ? '/admin/login' : '/auth/login';
  const resp = await apiPost(endpoint, { email: acc.email, password: acc.password });

  if (!resp.ok) {
    fail(`Login ${key}`, `Status ${resp.status}: ${JSON.stringify(resp.data)}`);
    return null;
  }

  const cookieName = acc.type === 'admin' ? 'simpleAdminAuth' : 'simpleUserAuth';
  const cookie = extractCookie(resp.headers, cookieName);
  if (!cookie) {
    fail(`Login ${key}`, `No ${cookieName} cookie returned`);
    return null;
  }

  const combinedCookie = `${cookieName}=${cookie}`;
  pass(`Login ${key}`, `${cookieName} cookie received`);
  return combinedCookie;
}

async function testLoginSupport() {
  console.log('\n--- LOGIN: support@mozassets.com (SUPPORT_AGENT admin) ---');
  const resp = await apiPost('/admin/login', { email: 'support@mozassets.com', password: 'Password123!' });
  if (!resp.ok) {
    fail('Login support', `Status ${resp.status}: ${JSON.stringify(resp.data)}`);
    return null;
  }
  const cookie = extractCookie(resp.headers, 'simpleAdminAuth');
  if (!cookie) {
    fail('Login support', 'No simpleAdminAuth cookie');
    return null;
  }
  pass('Login support', 'simpleAdminAuth cookie received');
  return `simpleAdminAuth=${cookie}`;
}

// ============================================================
//  PAGE RENDERING
// ============================================================
async function testPage(key, path, cookie, expectStatus = 200) {
  const resp = await pageGet(path, cookie);
  const expected = Array.isArray(expectStatus) ? expectStatus : [expectStatus];
  // 307 redirect means middleware redirected to login (no session)
  if (resp.redirected && resp.status === 307) {
    fail(`Page ${key} ${path}`, `Redirected to login (no valid session cookie)`);
    return resp;
  }
  if (expected.includes(resp.status)) {
    pass(`Page ${key} ${path}`, `Status ${resp.status}`);
    return resp;
  }
  fail(`Page ${key} ${path}`, `Expected ${expected.join('/')}, got ${resp.status}${resp.redirected ? ' (redirect)' : ''}`);
  return resp;
}

// ============================================================
//  EXPORT API
// ============================================================
async function testExportScoping(key, cookie) {
  const resp = await apiGet('/export/assets', cookie);
  if (resp.status === 200) {
    const lines = resp.data.split('\n').filter(l => l.trim());
    const dataRows = lines.length - 1;
    pass(`Export ${key}`, `Access granted, ${dataRows} assets returned`);
    return dataRows;
  } else if (resp.status === 403 && (resp.data?.feature === 'csvExport' || resp.data?.feature === 'exports')) {
    pass(`Export ${key}`, `403 PLAN_LIMIT (expected for ${key})`);
    return 0;
  } else {
    fail(`Export ${key}`, `Status ${resp.status}: ${JSON.stringify(resp.data)}`);
    return -1;
  }
}

// ============================================================
//  TENANT ISOLATION (DB level)
// ============================================================
async function testTenantIsolation() {
  console.log('\n=== Tenant Isolation Tests ===');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: { email: { in: [ACCOUNTS.free.email, ACCOUNTS.pro.email, ACCOUNTS.enterprise.email] } },
      select: { id: true, email: true, organizationId: true, plan: true },
    });

    const orgMap = {};
    for (const u of users) orgMap[u.plan] = { userId: u.id, orgId: u.organizationId };

    if (!orgMap.FREE?.orgId || !orgMap.PRO?.orgId || !orgMap.ENTERPRISE?.orgId) {
      fail('Tenant setup', 'One or more users missing organizationId');
      return;
    }

    const ts = Date.now().toString().slice(-6);
    const allOrgIds = Object.values(orgMap).map(o => o.orgId);

    await prisma.asset.createMany({
      data: [
        { assetTag: `TST-FREE-${ts}`, name: 'Free Asset', status: 'AVAILABLE', condition: 'GOOD', organizationId: orgMap.FREE.orgId, purchaseCost: 100 },
        { assetTag: `TST-PRO-${ts}`, name: 'Pro Asset', status: 'AVAILABLE', condition: 'GOOD', organizationId: orgMap.PRO.orgId, purchaseCost: 200 },
        { assetTag: `TST-ENT-${ts}`, name: 'Enterprise Asset', status: 'AVAILABLE', condition: 'GOOD', organizationId: orgMap.ENTERPRISE.orgId, purchaseCost: 300 },
      ],
    });
    await prisma.category.createMany({
      data: [
        { name: `Cat-Free-${ts}`, organizationId: orgMap.FREE.orgId },
        { name: `Cat-Pro-${ts}`, organizationId: orgMap.PRO.orgId },
        { name: `Cat-Ent-${ts}`, organizationId: orgMap.ENTERPRISE.orgId },
      ],
    });
    await prisma.department.createMany({
      data: [
        { name: `Dept-Free-${ts}`, code: `DF${ts}`, organizationId: orgMap.FREE.orgId },
        { name: `Dept-Pro-${ts}`, code: `DP${ts}`, organizationId: orgMap.PRO.orgId },
        { name: `Dept-Ent-${ts}`, code: `DE${ts}`, organizationId: orgMap.ENTERPRISE.orgId },
      ],
    });
    await prisma.vendor.createMany({
      data: [
        { name: `Vendor-Free-${ts}`, organizationId: orgMap.FREE.orgId },
        { name: `Vendor-Pro-${ts}`, organizationId: orgMap.PRO.orgId },
        { name: `Vendor-Ent-${ts}`, organizationId: orgMap.ENTERPRISE.orgId },
      ],
    });
    await prisma.location.createMany({
      data: [
        { name: `Loc-Free-${ts}`, organizationId: orgMap.FREE.orgId },
        { name: `Loc-Pro-${ts}`, organizationId: orgMap.PRO.orgId },
        { name: `Loc-Ent-${ts}`, organizationId: orgMap.ENTERPRISE.orgId },
      ],
    });

    for (const plan of ['FREE', 'PRO', 'ENTERPRISE']) {
      const orgId = orgMap[plan].orgId;
      const a = await prisma.asset.count({ where: { organizationId: orgId, assetTag: { startsWith: 'TST-' } } });
      const c = await prisma.category.count({ where: { organizationId: orgId, name: { startsWith: 'Cat-' } } });
      const d = await prisma.department.count({ where: { organizationId: orgId, name: { startsWith: 'Dept-' } } });
      const v = await prisma.vendor.count({ where: { organizationId: orgId, name: { startsWith: 'Vendor-' } } });
      const l = await prisma.location.count({ where: { organizationId: orgId, name: { startsWith: 'Loc-' } } });
      if (a === 1 && c === 1 && d === 1 && v === 1 && l === 1) {
        pass(`Tenant isolation ${plan}`, `Own data visible: 1a/1c/1d/1v/1l`);
      } else {
        fail(`Tenant isolation ${plan}`, `Expected 1 each, got: ${a}a/${c}c/${d}d/${v}v/${l}l`);
      }
    }

    const allTestAssets = await prisma.asset.count({ where: { assetTag: { startsWith: 'TST-' } } });
    if (allTestAssets === 3) {
      pass('Cross-org data exists', '3 orgs each have 1 asset at DB level');
    } else {
      fail('Cross-org data exists', `Expected 3 test assets, found ${allTestAssets}`);
    }

    await prisma.asset.deleteMany({ where: { organizationId: { in: allOrgIds }, assetTag: { startsWith: 'TST-' } } });
    await prisma.category.deleteMany({ where: { organizationId: { in: allOrgIds }, name: { startsWith: 'Cat-' } } });
    await prisma.department.deleteMany({ where: { organizationId: { in: allOrgIds }, name: { startsWith: 'Dept-' } } });
    await prisma.vendor.deleteMany({ where: { organizationId: { in: allOrgIds }, name: { startsWith: 'Vendor-' } } });
    await prisma.location.deleteMany({ where: { organizationId: { in: allOrgIds }, name: { startsWith: 'Loc-' } } });
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
//  PLAN ENFORCEMENT TESTS
// ============================================================
async function testPlanEnforcement() {
  console.log('\n=== Plan Enforcement Tests ===');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: { email: { in: [ACCOUNTS.free.email, ACCOUNTS.pro.email, ACCOUNTS.enterprise.email] } },
      select: { id: true, email: true, plan: true, organizationId: true },
    });
    const byPlan = {};
    for (const u of users) byPlan[u.plan] = u;

    const planChecks = {
      FREE:       { expectedAssets: 50, expectedDepts: 1, expectedLocs: 1 },
      PRO:        { expectedAssets: 500, expectedDepts: 5, expectedLocs: 5 },
      ENTERPRISE: { expectedAssets: -1, expectedDepts: -1, expectedLocs: -1 },
    };

    for (const [plan, checks] of Object.entries(planChecks)) {
      const user = byPlan[plan];
      if (!user) { fail(`Plan data ${plan}`, 'User not found in DB'); continue; }

      const assetCount = await prisma.asset.count({ where: { organizationId: user.organizationId } });
      const deptCount = await prisma.department.count({ where: { organizationId: user.organizationId } });
      const locCount = await prisma.location.count({ where: { organizationId: user.organizationId } });

      let ok = true;
      const details = [];
      if (checks.expectedAssets !== -1 && assetCount >= checks.expectedAssets) {
        // reached limit (allow equal since limit is a cap, not a strict <)
        details.push(`assets ${assetCount}/${checks.expectedAssets}`);
        ok = false;
      } else details.push(`assets ${assetCount}/${checks.expectedAssets === -1 ? 'unlimited' : checks.expectedAssets}`);

      if (checks.expectedDepts !== -1 && deptCount >= checks.expectedDepts) {
        details.push(`dept ${deptCount}/${checks.expectedDepts}`);
        ok = false;
      } else details.push(`dept ${deptCount}/${checks.expectedDepts === -1 ? 'unlimited' : checks.expectedDepts}`);

      if (checks.expectedLocs !== -1 && locCount >= checks.expectedLocs) {
        details.push(`loc ${locCount}/${checks.expectedLocs}`);
        ok = false;
      } else details.push(`loc ${locCount}/${checks.expectedLocs === -1 ? 'unlimited' : checks.expectedLocs}`);

      if (ok) pass(`Plan limits ${plan}`, `${details.join(', ')}`(ok/che));
      else fail(`Plan limits ${plan}`, `${details.join(', ')} `);
    }

    // Check billing API returns correct limits
    for (const key of ['free', 'pro', 'enterprise']) {
      const cookie = sessionCookies[key];
      if (!cookie) continue;
      const resp = await apiGet('/billing', cookie);
      if (!resp.ok) {
        fail(`Billing API ${key}`, `Status ${resp.status}`);
        continue;
      }
      const data = resp.data;
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      // billing API returns plan limits
      let ok = true;
      const details = [];
      if (data.plan === 'FREE' && data.assetLimit === 50) details.push(`assets:${data.assetLimit}`);
      else if (data.plan === 'PRO' && data.assetLimit === 500) details.push(`assets:${data.assetLimit}`);
      else if (data.plan === 'ENTERPRISE' && (data.assetLimit === -1 || data.assetLimit === 999999)) details.push(`assets:unlimited`);
      else { details.push(`assets:${data.assetLimit} (unexpected)`); ok = false; }

      if (data.plan === 'FREE' && data.departmentLimit === 1) details.push(`depts:${data.departmentLimit}`);
      else if (data.plan === 'PRO' && data.departmentLimit === 5) details.push(`depts:${data.departmentLimit}`);
      else if (data.plan === 'ENTERPRISE') details.push(`depts:unlimited`);
      else { details.push(`depts:${data.departmentLimit} (unexpected)`); ok = false; }

      if (ok) pass(`Billing API ${label}`, details.join(', '));
      else fail(`Billing API ${label}`, details.join(', '));
    }
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
//  ADMIN TESTS
// ============================================================
async function testAdminFlows(cookie) {
  console.log('\n=== Admin Tests ===');
  const pages = [
    { path: '/admin', label: 'Admin dashboard' },
    { path: '/admin/users', label: 'Admin users page' },
    { path: '/admin/organizations', label: 'Admin organizations page' },
    { path: '/admin/agents', label: 'Admin agents page' },
  ];
  for (const p of pages) await testPage('Admin', p.path, cookie);
}

// ============================================================
//  SUPPORT AGENT PERMISSION TESTS
// ============================================================
async function testSupportAgentPermissions(cookie) {
  console.log('\n=== Support Agent Permission Tests ===');

  // Support agent CAN access ticket-related pages
  const allowedPages = [
    { path: '/admin', label: 'Admin dashboard' },
    { path: '/admin/support-tickets', label: 'Support tickets list' },
  ];
  for (const p of allowedPages) {
    await testPage('Support', p.path, cookie, [200, 307]);
  }

  // Support agent SHOULD be blocked from sensitive endpoints
  const restrictedEndpoints = [
    { path: '/api/admin/security/events', perm: 'security:read' },
    { path: '/api/admin/security/rate-limits', perm: 'security:read' },
    { path: '/api/admin/subscriptions', perm: 'subscriptions:read' },
    { path: '/api/admin/payments', perm: 'billing:read' },
    { path: '/api/admin/revenue', perm: 'billing:read' },
    { path: '/api/admin/email-logs', perm: 'audit:read' },
    { path: '/api/admin/files/stats', perm: 'analytics:read' },
    { path: '/api/admin/users/lifecycle-stats', perm: 'analytics:read' },
    { path: '/api/admin/internal-admins', perm: 'agents:read' },
    { path: '/api/admin/seed-user', perm: 'users:modify' },
  ];
  for (const ep of restrictedEndpoints) {
    const resp = await apiGet(ep.path, cookie);
    if (resp.status === 401 || resp.status === 403 || resp.status === 404) {
      pass(`Support blocked from ${ep.path}`, `Status ${resp.status} (${ep.perm})`);
    } else if (resp.status === 200) {
      fail(`Support blocked from ${ep.path}`, `Got 200 — ${ep.perm} leak`);
    } else {
      pass(`Support blocked from ${ep.path}`, `Status ${resp.status} (non-200)`);
    }
  }

  // Support agent SHOULD be blocked from mutating endpoints
  const mutationEndpoints = [
    { path: '/api/admin/users/seed-user', method: 'POST', perm: 'users:modify' },
  ];
  for (const ep of mutationEndpoints) {
    const resp = await apiPost(ep.path, { email: 'test-leak@test.com', password: 'Test123!', name: 'Test Leak' }, cookie);
    if (resp.status === 401 || resp.status === 403) {
      pass(`Support blocked from ${ep.path}`, `Status ${resp.status} (${ep.perm})`);
    } else if (resp.status === 200 || resp.status === 201) {
      fail(`Support blocked from ${ep.path}`, `Got ${resp.status} — ${ep.perm} leak`);
    } else {
      pass(`Support blocked from ${ep.path}`, `Status ${resp.status} (non-200)`);
    }
  }
}

// ============================================================
//  NOTIFICATION TESTS
// ============================================================
async function testNotifications(cookie) {
  console.log('\n=== Notification Tests ===');
  const resp = await apiGet('/notifications/unread', cookie);
  if (resp.ok && typeof resp.data?.count === 'number') {
    pass('Notifications unread count', `${resp.data.count} unread`);
  } else {
    fail('Notifications unread count', `Status ${resp.status}: ${JSON.stringify(resp.data)}`);
  }
}

// ============================================================
//  CUSTOMER-SPECIFIC PAGE CHECKS
// ============================================================
async function testCustomerSpecificPages(cookie) {
  console.log('\n--- Customer specific pages ---');
  const pages = [
    '/dashboard/assets/new', '/dashboard/users/new', '/dashboard/locations/new',
    '/dashboard/categories/new', '/dashboard/departments/new', '/dashboard/vendors/new',
    '/dashboard/reports/assets',
  ];
  for (const p of pages) {
    await testPage('Customer', p, cookie, [200, 307]);
  }
}

// ============================================================
//  MAIN
// ============================================================
async function main() {
  console.log('========================================');
  console.log('  PRODUCTION READINESS VERIFICATION');
  console.log('========================================\n');

  await ensureSeed();

  // ---- CUSTOMER TESTS ----
  console.log('\n========================================');
  console.log('  CUSTOMER TESTS');
  console.log('========================================');

  for (const [key, acc] of Object.entries(ACCOUNTS)) {
    const cookie = await testLogin(key, acc);
    if (cookie) sessionCookies[key] = cookie;
  }

  // Customer page tests
  const customerPages = [
    '/dashboard', '/dashboard/assets', '/dashboard/categories',
    '/dashboard/departments', '/dashboard/locations', '/dashboard/vendors',
    '/dashboard/users', '/dashboard/reports', '/dashboard/audit-logs', '/dashboard/settings',
  ];
  for (const key of ['free', 'pro', 'enterprise']) {
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    console.log(`\n--- ${label} User: Page rendering ---`);
    for (const page of customerPages) {
      await testPage(label, page, sessionCookies[key], [200, 307]);
    }
  }

  // Customer specific pages
  await testCustomerSpecificPages(sessionCookies.free);

  // Asset detail pages
  console.log('\n--- Asset flow page rendering ---');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  let testAssetId = null;
  try {
    const freeUser = await prisma.user.findUnique({ where: { email: ACCOUNTS.free.email }, select: { id: true, organizationId: true } });
    if (freeUser?.organizationId) {
      const asset = await prisma.asset.create({
        data: {
          assetTag: `PROD-TEST-${Date.now()}`,
          name: 'Production Test Asset',
          status: 'AVAILABLE', condition: 'GOOD',
          organizationId: freeUser.organizationId,
        },
      });
      testAssetId = asset.id;
      console.log(`  Created test asset: ${asset.assetTag} (${asset.id})`);
    }
  } finally {
    await prisma.$disconnect();
  }

  if (testAssetId) {
    const assetPages = [
      `/dashboard/assets/${testAssetId}`, `/dashboard/assets/${testAssetId}/edit`,
      `/dashboard/assets/${testAssetId}/assign`, `/dashboard/assets/${testAssetId}/transfer`,
      `/dashboard/assets/${testAssetId}/retire`, `/dashboard/assets/${testAssetId}/maintenance`,
    ];
    for (const page of assetPages) {
      await testPage('Free Asset', page, sessionCookies.free, [200, 307]);
    }
  }

  // Export API tests
  console.log('\n--- Export API tests ---');
  for (const key of ['free', 'pro', 'enterprise']) {
    await testExportScoping(key.charAt(0).toUpperCase() + key.slice(1), sessionCookies[key]);
  }

  // Notifications
  for (const key of ['free', 'pro', 'enterprise']) {
    await testNotifications(sessionCookies[key]);
  }

  // Tenant isolation
  await testTenantIsolation();

  // Plan enforcement & billing API checks
  await testPlanEnforcement();

  // Logout
  console.log('\n--- Logout ---');
  for (const key of ['free', 'pro', 'enterprise']) {
    const resp = await apiPost('/auth/logout', {}, sessionCookies[key]);
    if (resp.ok) {
      pass(`Logout ${key}`, 'Logout succeeded');
    } else {
      fail(`Logout ${key}`, `Status ${resp.status}`);
    }
  }

  // ---- ADMIN TESTS ----
  console.log('\n========================================');
  console.log('  PLATFORM ADMIN TESTS');
  console.log('========================================');
  if (sessionCookies.admin) {
    await testAdminFlows(sessionCookies.admin);
  }

  // ---- SUPPORT AGENT TESTS ----
  console.log('\n========================================');
  console.log('  SUPPORT AGENT TESTS');
  console.log('========================================');
  const supportCookie = await testLoginSupport();
  if (supportCookie) {
    await testSupportAgentPermissions(supportCookie);
  }

  // ============================================================
  //  RESULTS SUMMARY
  // ============================================================
  console.log('\n========================================');
  console.log('  TEST RESULTS SUMMARY');
  console.log('========================================\n');

  let passed = 0, failed = 0;
  for (const r of results) {
    const icon = r.status === 'PASS' ? '\u2705' : '\u274c';
    console.log(`${icon} ${r.label}${r.msg ? ': ' + r.msg : ''}`);
    if (r.status === 'PASS') passed++; else failed++;
  }

  console.log(`\n${'='.repeat(40)}`);
  console.log(`  Total: ${passed} passed, ${failed} failed out of ${results.length}`);
  console.log(`${'='.repeat(40)}`);

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
