import { Body, Controller, Get, Param, Put, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkDaysService } from './work-days.service';
import { UpsertWorkDayDto } from './dto/work-day.dto';

@ApiTags('WorkDays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('work-days')
export class WorkDaysController {
  constructor(private readonly workDays: WorkDaysService) {}

  @Get()
  getMonth(
    @Request() req: any,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.workDays.getMonth(req.user.id, Number(year), Number(month));
  }

  @Put(':date')
  upsertDay(
    @Request() req: any,
    @Param('date') date: string,
    @Body() dto: UpsertWorkDayDto,
  ) {
    return this.workDays.upsertDay(req.user.id, date, dto);
  }
}
