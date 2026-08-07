import { resolve } from 'path';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '../../.env') });

import { PrismaClient, Role } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEFAULT_ROLES = [
  'CEO / Директор',
];

async function main() {
  console.log('🌱 Seeding database…');

  // #Company

  const company = await prisma.company.upsert({
    where: { id: 1 },
    update: {
      title: 'Iteam Technologies',
      description:
        'Українська продуктова компанія, що будує інструменти для операційної стійкості та управління командою.',
    },
    create: {
      title: 'Iteam Technologies',
      description:
        'Українська продуктова компанія, що будує інструменти для операційної стійкості та управління командою.',
    },
  });

  console.log(`  ✔ Company  "${company.title}" (id=${company.id})`);

  // #Roles

  for (const name of DEFAULT_ROLES) {
    await prisma.companyRole.upsert({
      where: { name_companyId: { name, companyId: company.id } },
      update: {},
      create: { name, companyId: company.id },
    });
  }

  console.log(`  ✔ Roles    ${DEFAULT_ROLES.length} default roles`);

  // #Users

  const SEEDS = [
    {
      email: 'admin@gmail.com',
      password: 'Admin1234!',
      fullName: 'Admin User',
      role: Role.ADMIN,
      occupation: 'CEO / Директор',
      phone: '+380991234567',
    },
  ];

  for (const seed of SEEDS) {
    const hashed = await bcrypt.hash(seed.password, 10);

    await prisma.user.upsert({
      where: { email: seed.email },
      update: {
        fullName: seed.fullName,
        role: seed.role,
        occupation: seed.occupation,
        phone: seed.phone,
        companyId: company.id,
      },
      create: {
        email: seed.email,
        password: hashed,
        fullName: seed.fullName,
        role: seed.role,
        occupation: seed.occupation,
        phone: seed.phone,
        companyId: company.id,
      },
    });

    console.log(
      `  ✔ ${seed.role.padEnd(5)} ${seed.email}  /  ${seed.password}`,
    );
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
