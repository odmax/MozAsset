import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const u = await p.user.findUnique({
    where: { email: 'free@test.com' },
    select: { id: true, email: true, name: true, plan: true, isActive: true },
  });
  console.log(u ? 'EXISTS: ' + JSON.stringify(u, null, 2) : 'NOT FOUND');
  await p.$disconnect();
}
main().catch((e) => { console.error(e); p.$disconnect(); });
