import { ArrayNotEmpty, IsArray, IsEnum, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PROJECT_ROLES, ProjectRole } from './project-role';

export class AddProjectMembersDto {
  @ApiProperty({ example: [2, 3] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  userIds: number[];

  @ApiProperty({ example: 'HELPER', enum: PROJECT_ROLES })
  @IsEnum(PROJECT_ROLES)
  role: ProjectRole;
}
