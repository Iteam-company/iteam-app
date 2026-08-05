import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Patch, Post, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from './tasks.service';
import {
  AssignUsersDto, CreateTaskDto, GetTasksQueryDto,
  UpdateMyStatusDto, UpdateTaskDto, UpdateTaskStatusDto,
} from './dto/task.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  create(@Request() req: any, @Body() dto: CreateTaskDto) {
    return this.tasks.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks — filterable by board, status, assignee, priority' })
  findAll(@Request() req: any, @Query() query: GetTasksQueryDto) {
    return this.tasks.findAll(req.user.id, query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get tasks assigned to the current user' })
  myTasks(@Request() req: any) {
    return this.tasks.getMyTasks(req.user.id);
  }

  @Patch('me/status')
  @ApiOperation({ summary: 'Update current user working-on status' })
  updateMyStatus(@Request() req: any, @Body() dto: UpdateMyStatusDto) {
    return this.tasks.updateMyStatus(req.user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  findOne(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.tasks.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  update(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(req.user.id, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update task status (quick shortcut for Kanban drag)' })
  updateStatus(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasks.updateStatus(req.user.id, id, dto);
  }

  @Post(':id/assignees')
  @ApiOperation({ summary: 'Add assignees to a task' })
  assign(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignUsersDto,
  ) {
    return this.tasks.assign(req.user.id, id, dto);
  }

  @Delete(':id/assignees/:userId')
  @ApiOperation({ summary: 'Remove an assignee from a task' })
  unassign(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) assigneeId: number,
  ) {
    return this.tasks.unassign(req.user.id, id, assigneeId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  remove(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.tasks.remove(req.user.id, id);
  }
}
