import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Work days for a month, or the whole year if `month` is omitted',
  })
  getRange(
    @Request() req: any,
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    const m = month ? Number(month) : undefined;
    return this.workDays.getRange(req.user.id, Number(year), m);
  }

  @Put(':date')
  @ApiOperation({
    summary:
      'Mark a date as an exception (weekend, sick leave, vacation, holiday)',
  })
  upsertDay(
    @Request() req: any,
    @Param('date') date: string,
    @Body() dto: UpsertWorkDayDto,
  ) {
    return this.workDays.upsertDay(req.user.id, date, dto);
  }

  @Delete(':date')
  @ApiOperation({
    summary: 'Clear an exception, reverting the date to a regular working day',
  })
  removeDay(@Request() req: any, @Param('date') date: string) {
    return this.workDays.removeDay(req.user.id, date);
  }
}
