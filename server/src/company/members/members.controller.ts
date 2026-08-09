import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { MembersService } from './members.service';
import {
  GetMembersQueryDto,
  UpdateMemberOccupationDto,
  UpdateMemberRoleDto,
  UpdateMemberSalaryDto,
} from './dto';

@ApiTags('Company Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('company/members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @ApiOperation({
    summary: 'List members — filterable by role, searchable, paginated',
  })
  getMembers(@Request() req: any, @Query() query: GetMembersQueryDto) {
    return this.members.getMembers(req.user.id, query);
  }

  @Patch(':id/role')
  @ApiOperation({
    summary:
      'Change a member role (USER ↔ ADMIN) — admin only, cannot self-target',
  })
  updateMemberRole(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.members.updateMemberRole(req.user.id, id, dto);
  }

  @Patch(':id/occupation')
  @ApiOperation({ summary: 'Change a member occupation — admin only' })
  updateMemberOccupation(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberOccupationDto,
  ) {
    return this.members.updateMemberOccupation(req.user.id, id, dto);
  }

  @Patch(':id/salary')
  @ApiOperation({ summary: 'Update member salary — admin only' })
  updateMemberSalary(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberSalaryDto,
  ) {
    return this.members.updateMemberSalary(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Remove a member from the company — admin only, cannot self-target',
  })
  removeMember(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.members.removeMember(req.user.id, id);
  }
}
