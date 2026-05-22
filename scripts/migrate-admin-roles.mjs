#!/usr/bin/env node

/**
 * scripts/migrate-admin-roles.mjs
 *
 * Migrates old admin roles to new role names:
 *   SUPER_ADMIN    -> PLATFORM_ADMIN
 *   FINANCE_ADMIN  -> ACCOUNT_MANAGER
 *
 * Run after schema update (prisma db push).
 * Usage: node scripts/migrate-admin-roles.mjs
 */

import prisma from '../src/lib/prisma';

async function main() {
  console.log('Migrating InternalAdmin roles...');

  // SUPER_ADMIN -> PLATFORM_ADMIN
  const superAdmins = await prisma.internalAdmin.updateMany({
    where: { role: 'SUPER_ADMIN' },
    data: { role: 'PLATFORM_ADMIN' },
  });
  console.log(`  SUPER_ADMIN -> PLATFORM_ADMIN: ${superAdmins.count} records updated`);

  // FINANCE_ADMIN -> ACCOUNT_MANAGER
  const financeAdmins = await prisma.internalAdmin.updateMany({
    where: { role: 'FINANCE_ADMIN' },
    data: { role: 'ACCOUNT_MANAGER' },
  });
  console.log(`  FINANCE_ADMIN -> ACCOUNT_MANAGER: ${financeAdmins.count} records updated`);

  console.log('Migration complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
