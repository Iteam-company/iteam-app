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

  /**
   * Work days for a range.
   * Omit `month` to get the whole year — the year calendar view needs all 12
   * months at once, and one query beats twelve round-trips.
   */
  async getRange(userId: number, year: number, month?: number) {
    await this.requireUser(userId);

    const hasMonth = month != null && !Number.isNaN(month);
    const start = hasMonth
      ? new Date(Date.UTC(year, month! - 1, 1))
      : new Date(Date.UTC(year, 0, 1));
    const end = hasMonth
      ? new Date(Date.UTC(year, month!, 0, 23, 59, 59, 999))
      : new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const workDays = await this.prisma.workDay.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });

    // Compute stats
    const workingDays = workDays.filter((d) => d.status === 'WORKING').length;
    const totalHours = workDays
      .filter((d) => d.startTime && d.endTime)
      .reduce((sum, d) => {
        return sum + (timeToMinutes(d.endTime!) - timeToMinutes(d.startTime!)) / 60;
      }, 0);

    return {
      workDays,
      stats: {
        workingDays,
        totalHours: Math.round(totalHours * 10) / 10,
      },
    };
  }

  async upsertDay(userId: number, date: string, dto: UpsertWorkDayDto) {
    const dateObj = new Date(date + 'T00:00:00.000Z');
    return this.prisma.workDay.upsert({
      where: { userId_date: { userId, date: dateObj } },
      update: { status: dto.status, startTime: dto.startTime ?? null, endTime: dto.endTime ?? null },
      create: { userId, date: dateObj, status: dto.status, startTime: dto.startTime, endTime: dto.endTime },
    });
  }
}
