import { resolve } from 'path';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '../../.env') });

import { PrismaClient, Role } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

// Use string literals — these enums only exist in the generated client after migration
const BoardType = { LIST: 'LIST', KANBAN: 'KANBAN', SCRUM: 'SCRUM' } as const;
const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
} as const;
const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;
const TaskEstimate = { S: 'S', M: 'M', L: 'L', XL: 'XL' } as const;
const NotifType = {
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_STATUS_CHANGED: 'TASK_STATUS_CHANGED',
} as const;

type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];
type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];
type TaskEstimate = (typeof TaskEstimate)[keyof typeof TaskEstimate];

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

  const userMap: Record<string, number> = {};

  for (const seed of SEEDS) {
    const hashed = await bcrypt.hash(seed.password, 10);

    const u = await prisma.user.upsert({
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

    userMap[seed.email] = u.id;
    console.log(
      `  ✔ ${seed.role.padEnd(5)} ${seed.email}  /  ${seed.password}`,
    );
  }

  const adminId = userMap['admin@gmail.com'];
  const devId = userMap['user@gmail.com'];
  const sofiaId = userMap['sofia.melnyk@iteam.ua'];
  const darId = userMap['daryna.lysenko@iteam.ua'];
  const andId = userMap['andriy.shevchenko@iteam.ua'];
  const ivanId = userMap['ivan.petrenko@iteam.ua'];

  // Cast to any — board/task/notification don't exist in the old generated client.
  // After `prisma migrate dev` the client is regenerated and these resolve correctly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  // ── Boards ─────────────────────────────────────────────────────────────────

  const kanban = await db.board.upsert({
    where: { id: 1 },
    update: { title: 'Product Board', type: BoardType.KANBAN },
    create: {
      title: 'Product Board',
      type: BoardType.KANBAN,
      companyId: company.id,
      createdById: adminId,
    },
  });

  const sprint = await db.board.upsert({
    where: { id: 2 },
    update: { title: 'Sprint 1', type: BoardType.SCRUM },
    create: {
      title: 'Sprint 1',
      type: BoardType.SCRUM,
      companyId: company.id,
      createdById: sofiaId,
    },
  });

  const list = await db.board.upsert({
    where: { id: 3 },
    update: { title: 'Marketing Tasks', type: BoardType.LIST },
    create: {
      title: 'Marketing Tasks',
      type: BoardType.LIST,
      companyId: company.id,
      createdById: andId,
    },
  });

  console.log(
    `  ✔ Boards   ${[kanban, sprint, list].map((b) => b.title).join(', ')}`,
  );

  // ── Tasks ──────────────────────────────────────────────────────────────────

  type TaskSeed = {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    estimate?: TaskEstimate;
    estimateHours?: number;
    boardId: number;
    createdById: number;
    assigneeIds: number[];
    startDate?: Date;
    endDate?: Date;
  };

  const TASKS: TaskSeed[] = [
    {
      title: 'Розробити систему авторизації',
      description: 'JWT + refresh tokens, захист маршрутів, скидання пароля',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      estimate: TaskEstimate.L,
      boardId: kanban.id,
      createdById: adminId,
      assigneeIds: [devId],
      startDate: new Date('2025-04-01'),
      endDate: new Date('2025-04-10'),
    },
    {
      title: 'UI: Дашборд команди',
      description: 'Таблиця учасників з фільтрами, пагінацією та ролями',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      estimate: TaskEstimate.M,
      boardId: kanban.id,
      createdById: adminId,
      assigneeIds: [darId, devId],
      startDate: new Date('2025-04-05'),
      endDate: new Date('2025-04-14'),
    },
    {
      title: 'Модуль задач — бекенд',
      description: 'REST API для boards, tasks, notifications',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      estimate: TaskEstimate.XL,
      boardId: kanban.id,
      createdById: adminId,
      assigneeIds: [devId, sofiaId],
      startDate: new Date('2025-04-15'),
      endDate: new Date('2025-04-30'),
    },
    {
      title: 'Модуль задач — фронтенд',
      description: 'Kanban board + List view + Task modal',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      estimate: TaskEstimate.XL,
      boardId: kanban.id,
      createdById: adminId,
      assigneeIds: [darId, devId],
      startDate: new Date('2025-04-20'),
      endDate: new Date('2025-05-05'),
    },
    {
      title: 'Підготувати дизайн онбордингу',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      estimate: TaskEstimate.M,
      boardId: sprint.id,
      createdById: sofiaId,
      assigneeIds: [darId],
      endDate: new Date('2025-05-01'),
    },
    {
      title: 'Написати специфікацію OKR модуля',
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      estimateHours: 3,
      boardId: sprint.id,
      createdById: sofiaId,
      assigneeIds: [sofiaId, adminId],
    },
    {
      title: 'Налаштувати CI/CD pipeline',
      description: 'GitHub Actions: lint → test → build → deploy',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      estimate: TaskEstimate.S,
      boardId: sprint.id,
      createdById: adminId,
      assigneeIds: [devId],
    },
    {
      title: 'Квартальна маркетингова кампанія Q2',
      description: 'Соціальні мережі, email-розсилка, рекламний бюджет',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.URGENT,
      estimate: TaskEstimate.L,
      boardId: list.id,
      createdById: andId,
      assigneeIds: [andId, ivanId],
      endDate: new Date('2025-04-30'),
    },
    {
      title: 'Оновити CRM контакти',
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      estimateHours: 2,
      boardId: list.id,
      createdById: andId,
      assigneeIds: [ivanId],
    },
    {
      title: 'HR: Провести 1-on-1 з командою',
      description: 'Індивідуальні зустрічі з кожним членом команди',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      estimateHours: 8,
      boardId: list.id,
      createdById: sofiaId,
      assigneeIds: [userMap['olena.kovalenko@iteam.ua']],
    },
  ];

  for (const t of TASKS) {
    const { assigneeIds, ...data } = t;
    const task = await db.task.create({
      data: {
        ...data,
        companyId: company.id,
        assignees: { create: assigneeIds.map((uid) => ({ userId: uid })) },
      },
    });

    // seed a notification for each assignee (except creator)
    const notifData = assigneeIds
      .filter((uid) => uid !== data.createdById)
      .map((uid) => ({
        userId: uid,
        type: NotifType.TASK_ASSIGNED,
        title: 'Вас призначено на задачу',
        body: `«${task.title}»`,
        taskId: task.id,
      }));

    if (notifData.length) {
      await db.notification.createMany({ data: notifData });
    }
  }

  console.log(`  ✔ Tasks    ${TASKS.length} tasks across 3 boards`);

  // ── Set working-on status for a few users ──────────────────────────────────

  const devTask = await db.task.findFirst({
    where: { title: 'Модуль задач — бекенд' },
  });
  if (devTask) {
    await db.user.update({
      where: { id: devId },
      data: {
        workingOnTaskId: devTask.id,
        statusNote: 'Пишу NotificationsService',
      },
    });
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
