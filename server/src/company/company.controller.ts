import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyService } from './company.service';
import {
  CreateCompanyDto,
  InviteUsersDto,
  SendMessageDto,
  UpdateCompanyDto,
  UpdateCompanySettingsDto,
} from './dto';

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
