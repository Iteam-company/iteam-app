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
  'Операційний директор',
  'Розробник',
  'Дизайнер',
  'HR-спеціаліст',
  'Маркетолог',
  'Менеджер з продажів',
  'Фінансовий аналітик',
];

async function main() {
  console.log('🌱 Seeding database…');

  // ── Company ────────────────────────────────────────────────────────────────

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

  // ── Roles ──────────────────────────────────────────────────────────────────

  for (const name of DEFAULT_ROLES) {
    await prisma.companyRole.upsert({
      where: { name_companyId: { name, companyId: company.id } },
      update: {},
      create: { name, companyId: company.id },
    });
  }

  console.log(`  ✔ Roles    ${DEFAULT_ROLES.length} default roles`);

  // ── Users ──────────────────────────────────────────────────────────────────

  const SEEDS = [
    {
      email: 'admin@gmail.com',
      password: 'Admin1234!',
      fullName: 'Admin User',
      role: Role.ADMIN,
      occupation: 'CEO / Директор',
      phone: '+380991234567',
    },
    {
      email: 'user@gmail.com',
      password: 'User1234!',
      fullName: 'Default User',
      role: Role.USER,
      occupation: 'Розробник',
      phone: '+380997654321',
    },
    {
      email: 'olena.kovalenko@iteam.ua',
      password: 'User1234!',
      fullName: 'Олена Коваленко',
      role: Role.USER,
      occupation: 'HR-спеціаліст',
      phone: '+380931112233',
    },
    {
      email: 'mykola.bondar@iteam.ua',
      password: 'User1234!',
      fullName: 'Микола Бондар',
      role: Role.USER,
      occupation: 'Фінансовий аналітик',
      phone: '+380932223344',
    },
    {
      email: 'sofia.melnyk@iteam.ua',
      password: 'User1234!',
      fullName: 'Софія Мельник',
      role: Role.ADMIN,
      occupation: 'Операційний директор',
      phone: '+380933334455',
    },
    {
      email: 'andriy.shevchenko@iteam.ua',
      password: 'User1234!',
      fullName: 'Андрій Шевченко',
      role: Role.USER,
      occupation: 'Маркетолог',
      phone: '+380934445566',
    },
    {
      email: 'daryna.lysenko@iteam.ua',
      password: 'User1234!',
      fullName: 'Дарина Лисенко',
      role: Role.USER,
      occupation: 'Дизайнер',
      phone: '+380935556677',
    },
    {
      email: 'ivan.petrenko@iteam.ua',
      password: 'User1234!',
      fullName: 'Іван Петренко',
      role: Role.USER,
      occupation: 'Менеджер з продажів',
      phone: '+380936667788',
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
