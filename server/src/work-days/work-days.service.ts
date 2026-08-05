import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertWorkDayDto } from './dto/work-day.dto';

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class WorkDaysService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('User not found');
    return user;
  }

  async getMonth(userId: number, year: number, month: number) {
    const user = await this.requireUser(userId);

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workDays = await (this.prisma as any).workDay.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });

    // Get tasks completed this month that this user is assigned to
    const completedTasks = await this.prisma.task.findMany({
      where: {
        companyId: user.companyId ?? undefined,
        assignees: { some: { userId } },
        status: 'DONE',
        updatedAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        updatedAt: true,
        board: { select: { title: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Compute stats
    const workingDays = workDays.filter((d: any) => d.status === 'WORKING').length;
    const totalHours = workDays
      .filter((d: any) => d.startTime && d.endTime)
      .reduce((sum: number, d: any) => {
        return sum + (timeToMinutes(d.endTime) - timeToMinutes(d.startTime)) / 60;
      }, 0);

    return {
      workDays,
      completedTasks,
      stats: {
        workingDays,
        totalHours: Math.round(totalHours * 10) / 10,
        completedCount: completedTasks.length,
      },
    };
  }

  async upsertDay(userId: number, date: string, dto: UpsertWorkDayDto) {
    const dateObj = new Date(date + 'T00:00:00.000Z');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.prisma as any).workDay.upsert({
      where: { userId_date: { userId, date: dateObj } },
      update: { status: dto.status, startTime: dto.startTime ?? null, endTime: dto.endTime ?? null },
      create: { userId, date: dateObj, status: dto.status, startTime: dto.startTime, endTime: dto.endTime },
    });
  }
}
