import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type NotifType = 'TASK_ASSIGNED' | 'TASK_UNASSIGNED' | 'TASK_STATUS_CHANGED' | 'TASK_UPDATED';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Internal helpers used by TasksService ─────────────────────────────────

  async notifyAssigned(task: { id: number; title: string }, userIds: number[], byUserId: number) {
    const actor = await this.prisma.user.findUnique({
      where: { id: byUserId },
      select: { fullName: true },
    });
    const name = actor?.fullName ?? 'Someone';
    await this.prisma.notification.createMany({
      data: userIds
        .filter((uid) => uid !== byUserId)
        .map((uid) => ({
          userId: uid,
          type: 'TASK_ASSIGNED' as NotifType,
          title: `Вас призначено на задачу`,
          body: `«${task.title}» — ${name}`,
          taskId: task.id,
        })),
      skipDuplicates: true,
    });
  }

  async notifyUpdated(task: { id: number; title: string }, userIds: number[], byUserId: number) {
    const actor = await this.prisma.user.findUnique({
      where: { id: byUserId },
      select: { fullName: true },
    });
    const name = actor?.fullName ?? 'Someone';
    await this.prisma.notification.createMany({
      data: userIds
        .filter((uid) => uid !== byUserId)
        .map((uid) => ({
          userId: uid,
          type: 'TASK_UPDATED' as NotifType,
          title: `Задачу оновлено`,
          body: `«${task.title}» — ${name}`,
          taskId: task.id,
        })),
      skipDuplicates: true,
    });
  }

  async notifyStatusChanged(
    task: { id: number; title: string; status: string },
    userIds: number[],
    byUserId: number,
  ) {
    const actor = await this.prisma.user.findUnique({
      where: { id: byUserId },
      select: { fullName: true },
    });
    const name = actor?.fullName ?? 'Someone';
    await this.prisma.notification.createMany({
      data: userIds
        .filter((uid) => uid !== byUserId)
        .map((uid) => ({
          userId: uid,
          type: 'TASK_STATUS_CHANGED' as NotifType,
          title: `Статус задачі змінено`,
          body: `«${task.title}» → ${task.status} — ${name}`,
          taskId: task.id,
        })),
      skipDuplicates: true,
    });
  }

  // ── User-facing endpoints ─────────────────────────────────────────────────

  async findMine(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
      take: 50,
      include: { task: { select: { id: true, title: true } } },
    });
  }

  async unreadCount(userId: number) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  async markRead(userId: number, id: number) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { ok: true };
  }
}
