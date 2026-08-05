import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Patch, Post, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BoardsService } from './boards.service';
import { CreateBoardDto, UpdateBoardDto } from './dto/board.dto';

@ApiTags('Boards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('boards')
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a board' })
  create(@Request() req: any, @Body() dto: CreateBoardDto) {
    return this.boards.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all boards for the company' })
  findAll(@Request() req: any) {
    return this.boards.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a board with its tasks' })
  findOne(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.boards.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a board' })
  update(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.boards.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a board and all its tasks' })
  remove(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.boards.remove(req.user.id, id);
  }
}
