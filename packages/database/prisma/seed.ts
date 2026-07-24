/**
 * Development seed script. Creates a demo admin user with default settings
 * and empty ledger accounts. Run with: npm run prisma:seed --workspace=packages/database
 */
import { PrismaClient, UserRole } from './../src/generated';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@declawd.local' },
    update: {},
    create: {
      email: 'admin@declawd.local',
      displayName: 'DeClawd Admin',
      googleSubject: 'seed-admin-subject',
      role: UserRole.ADMIN,
      settings: {
        create: {},
      },
      ledgerAccounts: {
        create: [{ type: 'TRADING_POOL' }, { type: 'PROTECTED_VAULT' }],
      },
    },
  });

  console.log(`Seeded admin user: ${admin.email} (${admin.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
