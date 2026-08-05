import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto, UpdateBoardDto } from './dto/board.dto';

const BOARD_INCLUDE = {
  createdBy: { select: { id: true, fullName: true } },
  _count: { select: { tasks: true } },
} as const;

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateBoardDto) {
    const companyId = await this.requireCompany(userId);
    return this.prisma.board.create({
      data: { ...dto, companyId, createdById: userId },
      include: BOARD_INCLUDE,
    });
  }

  async findAll(userId: number) {
    const companyId = await this.requireCompany(userId);
    return this.prisma.board.findMany({
      where: { companyId },
      include: BOARD_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(userId: number, boardId: number) {
    const companyId = await this.requireCompany(userId);
    const board = await this.prisma.board.findFirst({
      where: { id: boardId, companyId },
      include: {
        ...BOARD_INCLUDE,
        tasks: {
          include: {
            createdBy: { select: { id: true, fullName: true } },
            assignees: {
              include: { user: { select: { id: true, fullName: true, occupation: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!board) throw new NotFoundException('Board not found');
    return board;
  }

  async update(userId: number, boardId: number, dto: UpdateBoardDto) {
    const companyId = await this.requireCompany(userId);
    const board = await this.prisma.board.findFirst({ where: { id: boardId, companyId } });
    if (!board) throw new NotFoundException('Board not found');
    return this.prisma.board.update({
      where: { id: boardId },
      data: dto,
      include: BOARD_INCLUDE,
    });
  }

  async remove(userId: number, boardId: number) {
    const companyId = await this.requireCompany(userId);
    const board = await this.prisma.board.findFirst({ where: { id: boardId, companyId } });
    if (!board) throw new NotFoundException('Board not found');
    await this.prisma.board.delete({ where: { id: boardId } });
    return { deleted: true };
  }

  private async requireCompany(userId: number): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.companyId)
      throw new ForbiddenException('User does not belong to a company');
    return user.companyId;
  }
}
