import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AssignUsersDto, CreateTaskDto, GetTasksQueryDto,
  UpdateMyStatusDto, UpdateTaskDto, UpdateTaskStatusDto,
} from './dto/task.dto';
import { paginate } from '../common/paginate';

const TASK_INCLUDE = {
  createdBy: { select: { id: true, fullName: true } },
  board: { select: { id: true, title: true, type: true } },
  assignees: {
    include: { user: { select: { id: true, fullName: true, occupation: true } } },
    orderBy: { assignedAt: 'asc' as const },
  },
} as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────

  async create(userId: number, dto: CreateTaskDto) {
    const companyId = await this.requireCompany(userId);

    const board = await this.prisma.board.findFirst({
      where: { id: dto.boardId, companyId },
    });
    if (!board) throw new NotFoundException('Board not found');

    const { assigneeIds, ...rest } = dto;

    const task = await this.prisma.task.create({
      data: {
        ...rest,
        startDate: rest.startDate ? new Date(rest.startDate) : undefined,
        endDate: rest.endDate ? new Date(rest.endDate) : undefined,
        companyId,
        createdById: userId,
        assignees: assigneeIds?.length
          ? { create: assigneeIds.map((uid) => ({ userId: uid })) }
          : undefined,
      },
      include: TASK_INCLUDE,
    });

    // Notify assignees
    if (assigneeIds?.length) {
      await this.notifications.notifyAssigned(task, assigneeIds, userId);
    }

    return task;
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async findAll(userId: number, query: GetTasksQueryDto) {
    const companyId = await this.requireCompany(userId);

    const where: Record<string, unknown> = { companyId };
    if (query.boardId) where.boardId = query.boardId;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.assigneeId)
      where.assignees = { some: { userId: query.assigneeId } };
    if (query.search?.trim()) {
      where.OR = [
        { title: { contains: query.search.trim(), mode: 'insensitive' } },
        { description: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    return paginate(
      this.prisma.task,
      query,
      { where, include: TASK_INCLUDE, orderBy: { createdAt: 'desc' } },
    );
  }

  // ── Detail ────────────────────────────────────────────────────────────────

  async findOne(userId: number, taskId: number) {
    const companyId = await this.requireCompany(userId);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, companyId },
      include: TASK_INCLUDE,
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(userId: number, taskId: number, dto: UpdateTaskDto) {
    const companyId = await this.requireCompany(userId);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
    if (!task) throw new NotFoundException('Task not found');

    const { assigneeIds, ...rest } = dto;

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...rest,
        startDate: rest.startDate ? new Date(rest.startDate) : undefined,
        endDate: rest.endDate ? new Date(rest.endDate) : undefined,
      },
      include: TASK_INCLUDE,
    });

    // Notify about update
    const currentAssigneeIds = updated.assignees.map((a) => a.userId);
    if (currentAssigneeIds.length) {
      await this.notifications.notifyUpdated(updated, currentAssigneeIds, userId);
    }

    return updated;
  }

  // ── Update status ─────────────────────────────────────────────────────────

  async updateStatus(userId: number, taskId: number, dto: UpdateTaskStatusDto) {
    const companyId = await this.requireCompany(userId);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
    if (!task) throw new NotFoundException('Task not found');

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: dto.status },
      include: TASK_INCLUDE,
    });

    const assigneeIds = updated.assignees.map((a) => a.userId);
    if (assigneeIds.length) {
      await this.notifications.notifyStatusChanged(updated, assigneeIds, userId);
    }

    return updated;
  }

  // ── Assignees ─────────────────────────────────────────────────────────────

  async assign(userId: number, taskId: number, dto: AssignUsersDto) {
    const companyId = await this.requireCompany(userId);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
    if (!task) throw new NotFoundException('Task not found');

    // Upsert assignees (ignore already-assigned)
    await Promise.all(
      dto.userIds.map((uid) =>
        this.prisma.taskAssignee.upsert({
          where: { taskId_userId: { taskId, userId: uid } },
          update: {},
          create: { taskId, userId: uid },
        }),
      ),
    );

    await this.notifications.notifyAssigned(task, dto.userIds, userId);

    return this.prisma.task.findUnique({ where: { id: taskId }, include: TASK_INCLUDE });
  }

  async unassign(userId: number, taskId: number, assigneeId: number) {
    const companyId = await this.requireCompany(userId);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
    if (!task) throw new NotFoundException('Task not found');

    await this.prisma.taskAssignee.deleteMany({ where: { taskId, userId: assigneeId } });
    return this.prisma.task.findUnique({ where: { id: taskId }, include: TASK_INCLUDE });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async remove(userId: number, taskId: number) {
    const companyId = await this.requireCompany(userId);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.prisma.task.delete({ where: { id: taskId } });
    return { deleted: true };
  }

  // ── My tasks + status ─────────────────────────────────────────────────────

  async getMyTasks(userId: number) {
    await this.requireCompany(userId);
    return this.prisma.task.findMany({
      where: { assignees: { some: { userId } } },
      include: TASK_INCLUDE,
      orderBy: [{ status: 'asc' }, { endDate: 'asc' }],
    });
  }

  async updateMyStatus(userId: number, dto: UpdateMyStatusDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        workingOnTaskId: dto.workingOnTaskId ?? null,
        statusNote: dto.statusNote,
      },
      select: {
        id: true,
        workingOnTaskId: true,
        statusNote: true,
        workingOnTask: { select: { id: true, title: true, status: true } },
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async requireCompany(userId: number): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.companyId)
      throw new ForbiddenException('User does not belong to a company');
    return user.companyId;
  }
}
