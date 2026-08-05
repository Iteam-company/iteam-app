import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

const WORK_DAY_STATUSES = ['WORKING', 'WEEKEND', 'SICK_LEAVE', 'VACATION'] as const;
export type WorkDayStatus = typeof WORK_DAY_STATUSES[number];

export class UpsertWorkDayDto {
  @ApiProperty({ example: 'WORKING', enum: WORK_DAY_STATUSES })
  @IsEnum(WORK_DAY_STATUSES)
  status: WorkDayStatus;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime?: string;
}

export class GetMonthQueryDto {
  @ApiProperty({ example: 2025 })
  year: number;

  @ApiProperty({ example: 4 })
  month: number;
}
