import {
  IsString,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ 
    description: 'Admin ismi', 
    example: 'John Doe' 
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ 
    description: 'Telefon raqami', 
    example: '+998901234567' 
  })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiPropertyOptional({ 
    description: 'Telegram foydalanuvchi nomi', 
    example: 'johndoe' 
  })
  @IsString()
  @IsOptional()
  tg_username?: string;

  @ApiProperty({ 
    description: 'Parol (kamida 4 belgi)', 
    example: 'password123' 
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ 
    description: 'Profile rasm fayl yo\'li', 
    example: '/uploads/profiles/admin-123.jpg' 
  })
  @IsString()
  @IsOptional()
  profile_image?: string;
}

