import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

let passed = 0, failed = 0;
function pass(label, msg) { console.log(`  ✅ ${label}: ${msg}`); passed++; }
function fail(label, msg) { console.log(`  ❌ ${label}: ${msg}`); failed++; }

async function main() {
  console.log('=== TENANT SCOPING VERIFICATION ===\n');

  const ts = Date.now().toString().slice(-6);
  let orgA, orgB, orgC;

  try {
    // ============== SETUP: Create 3 orgs with data ==============
    console.log('--- Setup: Create 3 test orgs ---');

    // Org A
    const userA = await prisma.user.create({
      data: { email: `owner-a-${ts}@test.com`, name: 'Owner A', role: 'SUPER_ADMIN', plan: 'FREE', assetLimit: 50, onBoardingComplete: true },
    });
    orgA = await prisma.organization.create({ data: { name: `OrgA-${ts}`, ownerId: userA.id } });
    await prisma.user.update({ where: { id: userA.id }, data: { organizationId: orgA.id } });

    await prisma.asset.create({ data: { assetTag: `AST-A1-${ts}`, name: 'OrgA Asset 1', organizationId: orgA.id, status: 'AVAILABLE', condition: 'GOOD', purchaseCost: 10000 } });
    await prisma.asset.create({ data: { assetTag: `AST-A2-${ts}`, name: 'OrgA Asset 2', organizationId: orgA.id, status: 'ASSIGNED', condition: 'GOOD', purchaseCost: 20000 } });
    await prisma.category.create({ data: { name: `Cat-A-${ts}`, organizationId: orgA.id } });
    await prisma.department.create({ data: { name: `Dept-A-${ts}`, code: `DA${ts}`, organizationId: orgA.id } });
    await prisma.vendor.create({ data: { name: `Vendor-A-${ts}`, organizationId: orgA.id } });
    console.log('  ✅ Org A created with 2 assets, 1 cat, 1 dept, 1 vendor');

    // Org B
    const userB = await prisma.user.create({
      data: { email: `owner-b-${ts}@test.com`, name: 'Owner B', role: 'SUPER_ADMIN', plan: 'PRO', assetLimit: 1000, onBoardingComplete: true },
    });
    orgB = await prisma.organization.create({ data: { name: `OrgB-${ts}`, ownerId: userB.id } });
    await prisma.user.update({ where: { id: userB.id }, data: { organizationId: orgB.id } });

    await prisma.asset.create({ data: { assetTag: `AST-B1-${ts}`, name: 'OrgB Asset 1', organizationId: orgB.id, status: 'AVAILABLE', condition: 'EXCELLENT', purchaseCost: 5000 } });
    await prisma.category.create({ data: { name: `Cat-B-${ts}`, organizationId: orgB.id } });
    await prisma.department.create({ data: { name: `Dept-B-${ts}`, code: `DB${ts}`, organizationId: orgB.id } });
    await prisma.vendor.create({ data: { name: `Vendor-B-${ts}`, organizationId: orgB.id } });
    console.log('  ✅ Org B created with 1 asset, 1 cat, 1 dept, 1 vendor');

    // Org C
    const userC = await prisma.user.create({
      data: { email: `owner-c-${ts}@test.com`, name: 'Owner C', role: 'SUPER_ADMIN', plan: 'ENTERPRISE', assetLimit: -1, onBoardingComplete: true },
    });
    orgC = await prisma.organization.create({ data: { name: `OrgC-${ts}`, ownerId: userC.id } });
    await prisma.user.update({ where: { id: userC.id }, data: { organizationId: orgC.id } });

    await prisma.asset.create({ data: { assetTag: `AST-C1-${ts}`, name: 'OrgC Asset 1', organizationId: orgC.id, status: 'IN_REPAIR', condition: 'FAIR', purchaseCost: 100000 } });
    await prisma.category.create({ data: { name: `Cat-C-${ts}`, organizationId: orgC.id } });
    await prisma.department.create({ data: { name: `Dept-C-${ts}`, code: `DC${ts}`, organizationId: orgC.id } });
    await prisma.vendor.create({ data: { name: `Vendor-C-${ts}`, organizationId: orgC.id } });
    console.log('  ✅ Org C created with 1 asset, 1 cat, 1 dept, 1 vendor');

    const allOrgIds = [orgA.id, orgB.id, orgC.id];

    // ============== TEST 1: Each org sees own assets ==============
    console.log('\n--- TEST 1: Org-scoped asset counts ---');
    
    const assetsA = await prisma.asset.count({ where: { organizationId: orgA.id } });
    const assetsB = await prisma.asset.count({ where: { organizationId: orgB.id } });
    const assetsC = await prisma.asset.count({ where: { organizationId: orgC.id } });
    
    console.log(`  Org A assets: ${assetsA} (expect 2)`);
    console.log(`  Org B assets: ${assetsB} (expect 1)`);
    console.log(`  Org C assets: ${assetsC} (expect 1)`);
    
    if (assetsA === 2 && assetsB === 1 && assetsC === 1) {
      pass('Asset counts correct', 'Each org sees only its own assets');
    } else {
      fail('Asset counts', `A:${assetsA} B:${assetsB} C:${assetsC}`);
    }

    // ============== TEST 2: No cross-org leakage ==============
    console.log('\n--- TEST 2: Cross-org data isolation ---');

    for (const testOrg of allOrgIds) {
      const testName = testOrg === orgA.id ? 'Org A' : testOrg === orgB.id ? 'Org B' : 'Org C';
      const otherAssets = await prisma.asset.count({
        where: {
          organizationId: { not: testOrg },
          organizationId: { in: allOrgIds },
        },
      });
      // This query is wrong — can't mix not/in on same field. Fix:
    }

    // Proper isolation check: count assets that belong to OTHER orgs using separate queries
    const aOnlyAssets = assetsA;
    const bOnlyAssets = assetsB;
    const cOnlyAssets = assetsC;

    // A should NOT see B's or C's data
    const aSeesBcats = await prisma.category.count({ where: { organizationId: orgB.id } });
    const aSeesCcats = await prisma.category.count({ where: { organizationId: orgC.id } });
    
    console.log(`  Org A categories visible to Org A: ${assetsA > 0}`);
    console.log(`  Org B categories NOT visible to Org A: ${aSeesBcats === 0 ? 'OK (0)' : 'LEAK!'}`);
    console.log(`  Org C categories NOT visible to Org A: ${aSeesCcats === 0 ? 'OK (0)' : 'LEAK!'}`);
    
    if (aSeesBcats === 0 && aSeesCcats === 0) {
      pass('Data isolation (Org A)', 'Cannot see B or C data');
    } else {
      fail('Data isolation (Org A)', `Sees B:${aSeesBcats} C:${aSeesCcats}`);
    }

    const bSeesAcats = await prisma.category.count({ where: { organizationId: orgA.id } });
    const bSeesCcats = await prisma.category.count({ where: { organizationId: orgC.id } });
    if (bSeesAcats >= 0 && bSeesCcats >= 0) {
      // B should not be able to query A's or C's org directly
    }
    if (bSeesAcats === 0 && bSeesCcats === 0) {
      pass('Data isolation (Org B)', 'Cannot see A or C data');
    } else {
      fail('Data isolation (Org B)', `Sees A:${bSeesAcats} C:${bSeesCcats}`);
    }

    // ============== TEST 3: Status counts ==============
    console.log('\n--- TEST 3: Status counts (dashboard query pattern) ---');
    
    // Simulate dashboard buildWhere() pattern
    const orgAstatuses = await Promise.all([
      prisma.asset.count({ where: { organizationId: orgA.id, status: 'AVAILABLE' } }),
      prisma.asset.count({ where: { organizationId: orgA.id, status: 'ASSIGNED' } }),
      prisma.asset.count({ where: { organizationId: orgA.id, status: 'IN_REPAIR' } }),
      prisma.asset.count({ where: { organizationId: orgA.id, status: 'RETIRED' } }),
    ]);
    console.log(`  Org A by status: Available=${orgAstatuses[0]} Assigned=${orgAstatuses[1]} InRepair=${orgAstatuses[2]} Retired=${orgAstatuses[3]}`);
    
    if (orgAstatuses[0] === 1 && orgAstatuses[1] === 1 && orgAstatuses[2] === 0 && orgAstatuses[3] === 0) {
      pass('Status counts (Org A)', '1 Available, 1 Assigned, 0 InRepair, 0 Retired');
    } else {
      fail('Status counts (Org A)', `Got: ${JSON.stringify(orgAstatuses)}`);
    }

    // ============== TEST 4: Aggregate / total value ==============
    console.log('\n--- TEST 4: Total value (aggregate) ---');
    const valA = await prisma.asset.aggregate({ where: { organizationId: orgA.id }, _sum: { purchaseCost: true } });
    const valAactual = valA._sum.purchaseCost ? Number(valA._sum.purchaseCost) : 0;
    console.log(`  Org A total value: R${valAactual} (expect R30000)`);
    
    if (valAactual === 30000) {
      pass('Total value (Org A)', 'R30000');
    } else {
      fail('Total value (Org A)', `Got R${valAactual}`);
    }

    // ============== TEST 5: GroupBy (dashboard chart pattern) ==============
    console.log('\n--- TEST 5: GroupBy queries (chart data) ---');
    const catGroupA = await prisma.asset.groupBy({
      by: ['categoryId'], _count: true,
      where: { organizationId: orgA.id, category: { isNot: null } },
    });
    console.log(`  Org A categories with assets: ${catGroupA.length} (expect 0 — no category assigned to assets)`);
    // Note: assets were not linked to category, so groupBy returns 0

    const deptGroupA = await prisma.asset.groupBy({
      by: ['departmentId'], _count: true,
      where: { organizationId: orgA.id, department: { isNot: null } },
    });
    console.log(`  Org A departments with assets: ${deptGroupA.length} (expect 0 — no dept assigned)`);

    const statusGroupA = await prisma.asset.groupBy({
      by: ['status'], _count: true,
      where: { organizationId: orgA.id },
    });
    const statusCountA = statusGroupA.reduce((sum, s) => sum + s._count, 0);
    console.log(`  Org A assets by status (groupBy): ${statusCountA} total (expect 2)`);

    if (statusCountA === 2) {
      pass('GroupBy (Org A)', 'Captures all 2 assets by status');
    } else {
      fail('GroupBy (Org A)', `Got ${statusCountA}`);
    }

    // ============== TEST 6: Audit logs (NO organizationId crash) ==============
    console.log('\n--- TEST 6: AuditLog query safety ---');
    try {
      // This should NOT throw — AuditLog has no organizationId, so we scope via user relation
      const auditLogs = await prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: { user: { organizationId: orgA.id } },
        include: {
          user: { select: { name: true, email: true } },
          asset: { select: { assetTag: true, name: true } },
        },
      });
      console.log(`  Audit logs for Org A: ${auditLogs.length} (expected 0 unless actions performed)`);
      pass('AuditLog query', `No Prisma error — ${auditLogs.length} results`);

      // Also test: AuditLog query WITHOUT organizationId (should still work)
      const allAuditLogs = await prisma.auditLog.findMany({ take: 1 });
      console.log(`  Total audit logs in system: ${await prisma.auditLog.count()}`);
    } catch (err) {
      fail('AuditLog query', `Prisma error: ${err.message}`);
    }

    // ============== TEST 7: Reports overview API pattern ==============
    console.log('\n--- TEST 7: Reports overview query pattern ---');
    const whereClauseA = { organizationId: orgA.id };
    const reportAssets = await prisma.asset.count({ where: whereClauseA });
    const reportValue = await prisma.asset.aggregate({ where: whereClauseA, _sum: { purchaseCost: true } });
    const reportGroups = await prisma.asset.groupBy({ by: ['status'], _count: true, where: whereClauseA });
    
    console.log(`  Report assets: ${reportAssets} (expect 2)`);
    console.log(`  Report value: R${Number(reportValue._sum.purchaseCost || 0)} (expect R30000)`);
    console.log(`  Report status groups: ${reportGroups.length} (expect 2 statuses)`);

    if (reportAssets === 2 && Number(reportValue._sum.purchaseCost || 0) === 30000 && reportGroups.length === 2) {
      pass('Reports query pattern', 'Scoped correctly to org');
    } else {
      fail('Reports query pattern', `Assets:${reportAssets} Value:${Number(reportValue._sum.purchaseCost || 0)} Groups:${reportGroups.length}`);
    }

    // ============== TEST 8: Category/Department/Vendor counts ==============
    console.log('\n--- TEST 8: Entity counts ---');
    
    for (const [label, orgId, expAssets, expCats, expDepts, expVendors] of [
      ['Org A (FREE)', orgA.id, 2, 1, 1, 1],
      ['Org B (PRO)', orgB.id, 1, 1, 1, 1],
      ['Org C (ENTERPRISE)', orgC.id, 1, 1, 1, 1],
    ]) {
      const a = await prisma.asset.count({ where: { organizationId: orgId } });
      const c = await prisma.category.count({ where: { organizationId: orgId } });
      const d = await prisma.department.count({ where: { organizationId: orgId } });
      const v = await prisma.vendor.count({ where: { organizationId: orgId } });
      
      if (a === expAssets && c === expCats && d === expDepts && v === expVendors) {
        pass(`${label}`, `Assets:${a} Cats:${c} Depts:${d} Vendors:${v}`);
      } else {
        fail(`${label}`, `Got A:${a} C:${c} D:${d} V:${v}, exp A:${expAssets} C:${expCats} D:${expDepts} V:${expVendors}`);
      }
    }

    // ============== SUMMARY ==============
    console.log(`\n========================================`);
    console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

  } finally {
    // Cleanup all test data
    console.log('--- Cleanup ---');
    if (orgA && orgB && orgC) {
      const ids = [orgA.id, orgB.id, orgC.id];
      await prisma.asset.deleteMany({ where: { organizationId: { in: ids } } });
      await prisma.category.deleteMany({ where: { organizationId: { in: ids } } });
      await prisma.department.deleteMany({ where: { organizationId: { in: ids } } });
      await prisma.vendor.deleteMany({ where: { organizationId: { in: ids } } });
      const usersToDelete = await prisma.user.findMany({ where: { organizationId: { in: ids } }, select: { id: true } });
      await prisma.user.deleteMany({ where: { id: { in: usersToDelete.map(u => u.id) } } });
      await prisma.organization.deleteMany({ where: { id: { in: ids } } });
      console.log('  ✅ Test data cleaned up');
    }
    await prisma.$disconnect();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
