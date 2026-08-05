import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'P@ssw0rd!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'P@ssw0rd!' })
  @IsString()
  @MinLength(8)
  repeatPassword: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ example: '+94771234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '1995-06-15' })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  @IsOptional()
  @IsString()
  occupation?: string;
}

export class SignInDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'P@ssw0rd!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @ApiPropertyOptional({ example: '+380971234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  @IsOptional()
  @IsString()
  occupation?: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token received from forgot-password' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewP@ssw0rd!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'NewP@ssw0rd!' })
  @IsString()
  @MinLength(8)
  repeatPassword: string;
}
