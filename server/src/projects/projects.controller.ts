import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import {
  AddProjectMembersDto,
  CreateProjectDto,
  UpdateProjectDto,
} from './dto';

// Deliberately guarded by JwtAuthGuard only — every company member may add and
// remove projects and people, so there is no admin check anywhere here.
@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @ApiOperation({
    summary: 'List every company project with its holders and helpers',
  })
  findAll(@Request() req: any) {
    return this.projects.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single project' })
  findOne(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.projects.findOne(req.user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a project, optionally with its people' })
  create(@Request() req: any, @Body() dto: CreateProjectDto) {
    return this.projects.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a project or change its country and hours' })
  update(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(req.user.id, id, dto);
  }

  @Post(':id/members')
  @ApiOperation({
    summary: 'Attach holders or helpers — re-adding switches their role',
  })
  addMembers(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddProjectMembersDto,
  ) {
    return this.projects.addMembers(req.user.id, id, dto);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Detach a person from a project' })
  removeMember(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.projects.removeMember(req.user.id, id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project and all its memberships' })
  remove(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.projects.remove(req.user.id, id);
  }
}
