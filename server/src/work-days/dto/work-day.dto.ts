import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

const WORK_DAY_STATUSES = [
  'WEEKEND_PAID', 'WEEKEND_UNPAID',
  'SICK_LEAVE_PAID', 'SICK_LEAVE_UNPAID',
  'VACATION', 'HOLIDAY',
] as const;
export type WorkDayStatus = typeof WORK_DAY_STATUSES[number];

export class UpsertWorkDayDto {
  @ApiProperty({ example: 'VACATION', enum: WORK_DAY_STATUSES })
  @IsEnum(WORK_DAY_STATUSES)
  status: WorkDayStatus;
}

export class GetMonthQueryDto {
  @ApiProperty({ example: 2025 })
  year: number;

  @ApiProperty({ example: 4 })
  month: number;
}
