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
  @ApiPropertyOptional({ description: 'Foydalanuvchi ismi', example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Telefon raqami', example: '+998901234567' })
  @IsString()
  @IsOptional()
  phone_number?: string;

  // @ApiPropertyOptional({ description: 'Telegram ID', example: '123456789' })
  @IsString()
  @IsOptional()
  tg_id?: string;

  @ApiPropertyOptional({ description: 'Telegram foydalanuvchi nomi', example: 'johndoe' })
  @IsString()
  @IsOptional()
  tg_username?: string;

  @ApiPropertyOptional({ description: 'Parol (hash qilinadi)', example: 'password123' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'Foydalanuvchi roli', enum: UserRole, example: UserRole.BARBER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Sartarosh ishlayaptimi?', example: true })
  @IsBoolean()
  @IsOptional()
  working?: boolean;

  @ApiPropertyOptional({ 
    description: 'Sartarosh ish boshlash vaqti (HH:mm formatida)', 
    example: '09:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
  })
  @IsString()
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'work_start_time HH:mm formatida bo\'lishi kerak (masalan, 09:00)',
  })
  work_start_time?: string;

  @ApiPropertyOptional({ 
    description: 'Sartarosh ish tugash vaqti (HH:mm formatida)', 
    example: '18:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
  })
  @IsString()
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'work_end_time HH:mm formatida bo\'lishi kerak (masalan, 18:00)',
  })
  work_end_time?: string;

  @ApiPropertyOptional({ description: 'Profile rasm fayl yo\'li', example: '/uploads/profiles/user-123.jpg' })
  @IsString()
  @IsOptional()
  profile_image?: string;
}
