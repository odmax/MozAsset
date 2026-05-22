#!/usr/bin/env node

/**
 * scripts/normalize-emails.ts
 *
 * Normalizes all existing emails to lowercase (trimmed) across the database.
 * Detects case-insensitive duplicates and reports conflicts before migration.
 *
 * Run via: npx tsx scripts/normalize-emails.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function main() {
  console.log('=== Email Normalization Migration ===\n');

  // ── Step 1: Detect case-insensitive duplicates in User ──
  console.log('[1/4] Checking User emails for case-insensitive duplicates...');
  const allUsers = await prisma.user.findMany({ select: { id: true, email: true } });
  const userEmailMap = new Map<string, { id: string; original: string }[]>();
  for (const u of allUsers) {
    const key = normalizeEmail(u.email);
    if (!userEmailMap.has(key)) userEmailMap.set(key, []);
    userEmailMap.get(key)!.push({ id: u.id, original: u.email });
  }
  let userConflicts = 0;
  for (const [normalized, entries] of userEmailMap) {
    if (entries.length > 1) {
      userConflicts++;
      console.log(`  CONFLICT: "${normalized}" appears ${entries.length} times:`);
      for (const e of entries) console.log(`    - ${e.original} (id: ${e.id})`);
    }
  }
  if (userConflicts === 0) console.log('  No duplicates found. Safe to proceed.\n');
  else console.log(`\n  ⚠ ${userConflicts} conflict(s) found. Manual resolution required before migration.\n`);

  // ── Step 2: Detect case-insensitive duplicates in InternalAdmin ──
  console.log('[2/4] Checking InternalAdmin emails for case-insensitive duplicates...');
  const allAdmins = await prisma.internalAdmin.findMany({ select: { id: true, email: true } });
  const adminEmailMap = new Map<string, { id: string; original: string }[]>();
  for (const a of allAdmins) {
    const key = normalizeEmail(a.email);
    if (!adminEmailMap.has(key)) adminEmailMap.set(key, []);
    adminEmailMap.get(key)!.push({ id: a.id, original: a.email });
  }
  let adminConflicts = 0;
  for (const [normalized, entries] of adminEmailMap) {
    if (entries.length > 1) {
      adminConflicts++;
      console.log(`  CONFLICT: "${normalized}" appears ${entries.length} times:`);
      for (const e of entries) console.log(`    - ${e.original} (id: ${e.id})`);
    }
  }
  if (adminConflicts === 0) console.log('  No duplicates found. Safe to proceed.\n');
  else console.log(`\n  ⚠ ${adminConflicts} conflict(s) found. Manual resolution required before migration.\n`);

  if (userConflicts > 0 || adminConflicts > 0) {
    console.log('❌ Aborting: resolve conflicts manually before running this migration.');
    process.exit(1);
  }

  // ── Step 3: Normalize all User emails ──
  console.log('[3/4] Normalizing User emails...');
  let userUpdated = 0;
  let userSkipped = 0;
  for (const u of allUsers) {
    const normalized = normalizeEmail(u.email);
    if (normalized === u.email) {
      userSkipped++;
      continue;
    }
    await prisma.user.update({ where: { id: u.id }, data: { email: normalized } });
    userUpdated++;
  }
  console.log(`  ${userUpdated} updated, ${userSkipped} already normalized\n`);

  // ── Step 4: Normalize all InternalAdmin emails ──
  console.log('[4/4] Normalizing InternalAdmin emails...');
  let adminUpdated = 0;
  let adminSkipped = 0;
  for (const a of allAdmins) {
    const normalized = normalizeEmail(a.email);
    if (normalized === a.email) {
      adminSkipped++;
      continue;
    }
    await prisma.internalAdmin.update({ where: { id: a.id }, data: { email: normalized } });
    adminUpdated++;
  }
  console.log(`  ${adminUpdated} updated, ${adminSkipped} already normalized\n`);

  console.log('=== Migration complete ===');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
