import {
  IsString,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ 
    description: 'Client ismi', 
    example: 'Ali Valiyev' 
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
    description: 'Telegram ID', 
    example: '123456789' 
  })
  @IsString()
  @IsOptional()
  tg_id?: string;

  @ApiPropertyOptional({ 
    description: 'Telegram foydalanuvchi nomi', 
    example: 'ali_client' 
  })
  @IsString()
  @IsOptional()
  tg_username?: string;

  @ApiPropertyOptional({ 
    description: 'Profile rasm fayl yo\'li', 
    example: '/uploads/profiles/client-123.jpg' 
  })
  @IsString()
  @IsOptional()
  profile_image?: string;
}

