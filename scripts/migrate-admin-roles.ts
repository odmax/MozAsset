#!/usr/bin/env node

/**
 * scripts/migrate-admin-roles.ts
 *
 * Migrates old InternalAdmin roles:
 *   SUPER_ADMIN    -> PLATFORM_ADMIN
 *   FINANCE_ADMIN  -> ACCOUNT_MANAGER
 *
 * Run via: npx tsx scripts/migrate-admin-roles.ts
 * Must be run after `prisma db push` adds the new enum values.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Migrating InternalAdmin roles...');

  const superAdminCount = await prisma.internalAdmin.updateMany({
    where: { role: 'SUPER_ADMIN' },
    data: { role: 'PLATFORM_ADMIN' },
  });
  console.log(`  SUPER_ADMIN -> PLATFORM_ADMIN: ${superAdminCount.count} records`);

  const financeAdminCount = await prisma.internalAdmin.updateMany({
    where: { role: 'FINANCE_ADMIN' },
    data: { role: 'ACCOUNT_MANAGER' },
  });
  console.log(`  FINANCE_ADMIN -> ACCOUNT_MANAGER: ${financeAdminCount.count} records`);

  console.log('Migration complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
