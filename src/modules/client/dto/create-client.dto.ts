import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ 
    description: 'Client ismi', 
    example: 'Ali Valiyev',
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
    description: 'Telegram ID', 
    example: '123456789' 
  })
  @IsString()
  @IsOptional()
  tg_id?: string;

  @ApiPropertyOptional({ 
    description: 'Telegram foydalanuvchi nomi (@ belgisiz)', 
    example: 'ali_client' 
  })
  @IsString()
  @IsOptional()
  tg_username?: string;
}

