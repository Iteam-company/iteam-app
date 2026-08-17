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
import { FinancesService } from './finances.service';
import {
  CreateEdgeDto,
  CreateNodeDto,
  CreateSheetDto,
  UpdateNodeDto,
} from './dto';

@ApiTags('Finances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinancesController {
  constructor(private readonly finances: FinancesService) {}

  // ── Sheets ────────────────────────────────────────────────────────────────

  @Get('sheets')
  @ApiOperation({ summary: 'Tab strip — every sheet, newest month first' })
  listSheets(@Request() req: any) {
    return this.finances.listSheets(req.user.id);
  }

  @Get('template')
  @ApiOperation({
    summary: 'The company template sheet, created on first access',
  })
  getTemplate(@Request() req: any) {
    return this.finances.getTemplate(req.user.id);
  }

  @Get('sheets/:id')
  @ApiOperation({ summary: 'One sheet with all its boxes and arrows' })
  getSheet(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.finances.getSheet(req.user.id, id);
  }

  @Post('sheets')
  @ApiOperation({ summary: 'Start a month, cloning the template by default' })
  createSheet(@Request() req: any, @Body() dto: CreateSheetDto) {
    return this.finances.createSheet(req.user.id, dto);
  }

  @Delete('sheets/:id')
  @ApiOperation({ summary: 'Delete a month — the template cannot be deleted' })
  removeSheet(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.finances.removeSheet(req.user.id, id);
  }

  // ── Boxes ─────────────────────────────────────────────────────────────────

  @Post('sheets/:id/nodes')
  @ApiOperation({ summary: 'Add a destination, income source or note' })
  createNode(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateNodeDto,
  ) {
    return this.finances.createNode(req.user.id, id, dto);
  }

  @Patch('nodes/:id')
  @ApiOperation({ summary: 'Edit a box, or persist its position after a drag' })
  updateNode(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNodeDto,
  ) {
    return this.finances.updateNode(req.user.id, id, dto);
  }

  @Delete('nodes/:id')
  removeNode(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.finances.removeNode(req.user.id, id);
  }

  // ── Arrows ────────────────────────────────────────────────────────────────

  @Post('sheets/:id/edges')
  @ApiOperation({
    summary: 'Connect two boxes — normally income → destination',
  })
  createEdge(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEdgeDto,
  ) {
    return this.finances.createEdge(req.user.id, id, dto);
  }

  @Delete('edges/:id')
  removeEdge(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.finances.removeEdge(req.user.id, id);
  }
}
