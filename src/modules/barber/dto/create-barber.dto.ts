import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBarberDto {
  @ApiProperty({ 
    description: 'Barber ismi', 
    example: 'Ahmad Karimov',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty({ message: 'Ism talab qilinadi' })
  @MinLength(2, { message: 'Ism kamida 2 belgidan iborat bo\'lishi kerak' })
  name: string;

  @ApiPropertyOptional({ 
    description: 'Telefon raqami', 
    example: '+998901234567',
    pattern: '^\\+?[1-9]\\d{1,14}$',
  })
  @IsString()
  @IsOptional()
  phone_number?: string;

  @ApiPropertyOptional({ 
    description: 'Telegram ID', 
    example: '123456789' 
  })
  @IsString()
  @IsOptional()
  tg_id?: string;

  @ApiPropertyOptional({ 
    description: 'Telegram foydalanuvchi nomi (@ belgisiz)', 
    example: 'ahmad_barber' 
  })
  @IsString()
  @IsOptional()
  tg_username?: string;

  @ApiPropertyOptional({ 
    description: 'Parol (hash qilinadi, kamida 4 belgi)', 
    example: 'password123',
    minLength: 4,
  })
  @IsString()
  @IsOptional()
  @MinLength(4, { message: 'Parol kamida 4 belgidan iborat bo\'lishi kerak' })
  password?: string;

  @ApiPropertyOptional({ 
    description: 'Sartarosh ishlayaptimi?', 
    example: false 
  })
  @IsBoolean()
  @IsOptional()
  working?: boolean;

  @ApiPropertyOptional({ 
    description: 'Ish boshlash vaqti (HH:mm formatida)', 
    example: '09:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'work_start_time HH:mm formatida bo\'lishi kerak (masalan, 09:00)',
  })
  work_start_time?: string;

  @ApiPropertyOptional({ 
    description: 'Ish tugash vaqti (HH:mm formatida)', 
    example: '18:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'work_end_time HH:mm formatida bo\'lishi kerak (masalan, 18:00)',
  })
  work_end_time?: string;

  @ApiPropertyOptional({ 
    description: 'Profile rasm fayl yo\'li', 
    example: '/uploads/profiles/barber-123.jpg' 
  })
  @IsString()
  @IsOptional()
  profile_image?: string;
}

