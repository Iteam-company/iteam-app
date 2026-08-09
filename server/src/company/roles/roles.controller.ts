import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesService } from './roles.service';
import { BulkCreateRolesDto, CreateRoleDto } from './dto';

@ApiTags('Company Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('company/roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @ApiOperation({ summary: "List all roles for the current user's company" })
  getRoles(@Request() req: any) {
    return this.roles.getRoles(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a single role' })
  addRole(@Request() req: any, @Body() dto: CreateRoleDto) {
    return this.roles.addRole(req.user.id, dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk-create roles (onboarding step 2)' })
  bulkCreateRoles(@Request() req: any, @Body() dto: BulkCreateRolesDto) {
    return this.roles.bulkCreateRoles(req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a role by id' })
  deleteRole(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.roles.deleteRole(req.user.id, id);
  }
}
