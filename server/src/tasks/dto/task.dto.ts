import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty,
  IsNumber, IsOptional, IsString, Min,
} from 'class-validator';
import { PaginateDto } from '../../common/paginate';

export type TaskStatus   = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskEstimate = 'S' | 'M' | 'L' | 'XL';

const TASK_STATUSES   = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const TASK_ESTIMATES  = ['S', 'M', 'L', 'XL'] as const;

export class CreateTaskDto {
  @ApiProperty({ example: 'Implement login page' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Use JWT auth with refresh tokens' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1, description: 'Board ID' })
  @IsInt()
  boardId: number;

  @ApiPropertyOptional({ example: 'MEDIUM', enum: TASK_PRIORITIES })
  @IsOptional()
  @IsEnum(TASK_PRIORITIES)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: 'M', enum: TASK_ESTIMATES })
  @IsOptional()
  @IsEnum(TASK_ESTIMATES)
  estimate?: TaskEstimate;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimateHours?: number;

  @ApiPropertyOptional({ example: '2025-05-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-05-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: [1, 2], description: 'Assignee user IDs' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  assigneeIds?: number[];
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}

export class UpdateTaskStatusDto {
  @ApiProperty({ example: 'IN_PROGRESS', enum: TASK_STATUSES })
  @IsEnum(TASK_STATUSES)
  status: TaskStatus;
}

export class AssignUsersDto {
  @ApiProperty({ example: [1, 2] })
  @IsArray()
  @IsInt({ each: true })
  userIds: number[];
}

export class GetTasksQueryDto extends PaginateDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  boardId?: number;

  @ApiPropertyOptional({ example: 'TODO', enum: TASK_STATUSES })
  @IsOptional()
  @IsEnum(TASK_STATUSES)
  status?: TaskStatus;

  @ApiPropertyOptional({ example: 1, description: 'Filter by assignee user ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assigneeId?: number;

  @ApiPropertyOptional({ example: 'MEDIUM', enum: TASK_PRIORITIES })
  @IsOptional()
  @IsEnum(TASK_PRIORITIES)
  priority?: TaskPriority;
}

export class UpdateMyStatusDto {
  @ApiPropertyOptional({ example: 5, description: 'Task ID the user is working on' })
  @IsOptional()
  @IsInt()
  workingOnTaskId?: number | null;

  @ApiPropertyOptional({ example: 'Working on auth module' })
  @IsOptional()
  @IsString()
  statusNote?: string;
}
