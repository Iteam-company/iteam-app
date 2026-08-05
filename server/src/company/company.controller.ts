import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyService } from './company.service';
import {
  BulkCreateRolesDto,
  CreateCompanyDto,
  CreateRoleDto,
  GetMembersQueryDto,
  InviteUsersDto,
  SendMessageDto,
  UpdateCompanyDto,
  UpdateCompanySettingsDto,
  UpdateMemberOccupationDto,
  UpdateMemberRoleDto,
  UpdateMemberSalaryDto,
} from './dto/company.dto';

@ApiTags('Company')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('company')
export class CompanyController {
  constructor(private readonly company: CompanyService) {}

  // ── Company CRUD ──────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a company (onboarding step 1)' })
  create(@Request() req: any, @Body() dto: CreateCompanyDto) {
    return this.company.create(req.user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: "Get current user's company (null if none)" })
  getMe(@Request() req: any) {
    return this.company.findByUser(req.user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update company details' })
  update(@Request() req: any, @Body() dto: UpdateCompanyDto) {
    return this.company.update(req.user.id, dto);
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  @Get('settings')
  @ApiOperation({ summary: 'Get company settings (SMTP etc.)' })
  getSettings(@Request() req: any) {
    return this.company.getSettings(req.user.id);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update company settings — admin only' })
  updateSettings(@Request() req: any, @Body() dto: UpdateCompanySettingsDto) {
    return this.company.updateSettings(req.user.id, dto);
  }

  // ── Roles ─────────────────────────────────────────────────────────────────

  @Get('roles')
  @ApiOperation({ summary: "List all roles for the current user's company" })
  getRoles(@Request() req: any) {
    return this.company.getRoles(req.user.id);
  }

  @Post('roles')
  @ApiOperation({ summary: 'Add a single role' })
  addRole(@Request() req: any, @Body() dto: CreateRoleDto) {
    return this.company.addRole(req.user.id, dto);
  }

  @Post('roles/bulk')
  @ApiOperation({ summary: 'Bulk-create roles (onboarding step 2)' })
  bulkCreateRoles(@Request() req: any, @Body() dto: BulkCreateRolesDto) {
    return this.company.bulkCreateRoles(req.user.id, dto);
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: 'Delete a role by id' })
  deleteRole(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.company.deleteRole(req.user.id, id);
  }

  // ── Members ───────────────────────────────────────────────────────────────

  @Get('members')
  @ApiOperation({
    summary: 'List members — filterable by role, searchable, paginated',
  })
  getMembers(@Request() req: any, @Query() query: GetMembersQueryDto) {
    return this.company.getMembers(req.user.id, query);
  }

  @Patch('members/:id/role')
  @ApiOperation({
    summary:
      'Change a member role (USER ↔ ADMIN) — admin only, cannot self-target',
  })
  updateMemberRole(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.company.updateMemberRole(req.user.id, id, dto);
  }

  @Patch('members/:id/occupation')
  @ApiOperation({ summary: 'Change a member occupation — admin only' })
  updateMemberOccupation(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberOccupationDto,
  ) {
    return this.company.updateMemberOccupation(req.user.id, id, dto);
  }

  @Patch('members/:id/salary')
  @ApiOperation({ summary: 'Update member salary — admin only' })
  updateMemberSalary(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberSalaryDto,
  ) {
    return this.company.updateMemberSalary(req.user.id, id, dto);
  }

  @Delete('members/:id')
  @ApiOperation({
    summary:
      'Remove a member from the company — admin only, cannot self-target',
  })
  removeMember(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.company.removeMember(req.user.id, id);
  }

  // ── Invite ────────────────────────────────────────────────────────────────

  @Post('invite')
  @ApiOperation({ summary: 'Invite users by email (onboarding step 3)' })
  invite(@Request() req: any, @Body() dto: InviteUsersDto) {
    return this.company.inviteUsers(req.user.id, dto);
  }

  // ── Send message ──────────────────────────────────────────────────────────

  @Post('send-message')
  @ApiOperation({
    summary: 'Send a custom email to selected team members — admin only',
  })
  sendMessage(@Request() req: any, @Body() dto: SendMessageDto) {
    return this.company.sendMessage(req.user.id, dto);
  }
}
