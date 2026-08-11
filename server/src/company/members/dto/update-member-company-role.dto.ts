import { IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberCompanyRoleDto {
  @ApiProperty({
    example: 3,
    nullable: true,
    description: 'CompanyRole id to assign to the member, or null to unassign',
  })
  @IsOptional()
  @IsInt()
  companyRoleId: number | null;
}
