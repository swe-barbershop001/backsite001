import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ 
    description: 'Admin ismi', 
    example: 'John Doe',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty({ message: 'Ism talab qilinadi' })
  @MinLength(2, { message: 'Ism kamida 2 belgidan iborat bo\'lishi kerak' })
  name: string;

  @ApiProperty({ 
    description: 'Telefon raqami', 
    example: '+998901234567',
    pattern: '^\\+?[1-9]\\d{1,14}$',
  })
  @IsString()
  @IsNotEmpty({ message: 'Telefon raqami talab qilinadi' })
  phone_number: string;

  @ApiPropertyOptional({ 
    description: 'Telegram foydalanuvchi nomi (@ belgisiz)', 
    example: 'johndoe',
  })
  @IsString()
  @IsOptional()
  tg_username?: string;

  @ApiProperty({ 
    description: 'Parol (kamida 4 belgi)', 
    example: 'password123',
    minLength: 4,
  })
  @IsString()
  @IsNotEmpty({ message: 'Parol talab qilinadi' })
  @MinLength(4, { message: 'Parol kamida 4 belgidan iborat bo\'lishi kerak' })
  password: string;

  @ApiPropertyOptional({ 
    description: 'Profile rasm fayl yo\'li', 
    example: '/uploads/profiles/admin-123.jpg' 
  })
  @IsString()
  @IsOptional()
  profile_image?: string;
}

