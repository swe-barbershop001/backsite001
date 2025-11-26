import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/user.enum';

export class CreateUserDto {
  @ApiPropertyOptional({ description: 'User name', example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+998901234567' })
  @IsString()
  @IsOptional()
  phone_number?: string;

  @ApiPropertyOptional({ description: 'Telegram ID', example: '123456789' })
  @IsString()
  @IsOptional()
  tg_id?: string;

  @ApiPropertyOptional({ description: 'Telegram username', example: 'johndoe' })
  @IsString()
  @IsOptional()
  tg_username?: string;

  @ApiPropertyOptional({ description: 'Password (will be hashed)', example: 'password123' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'User role', enum: UserRole, example: UserRole.BARBER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Is barber working?', example: true })
  @IsBoolean()
  @IsOptional()
  working?: boolean;

  @ApiPropertyOptional({ 
    description: 'Barber work start time (HH:mm format)', 
    example: '09:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
  })
  @IsString()
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'work_start_time must be in HH:mm format (e.g., 09:00)',
  })
  work_start_time?: string;

  @ApiPropertyOptional({ 
    description: 'Barber work end time (HH:mm format)', 
    example: '18:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
  })
  @IsString()
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'work_end_time must be in HH:mm format (e.g., 18:00)',
  })
  work_end_time?: string;
}
