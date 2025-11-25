import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ description: 'Client full name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ description: 'Client phone number', example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({ description: 'Telegram user ID', example: '123456789' })
  @IsString()
  @IsNotEmpty()
  tg_id: string;

  @ApiPropertyOptional({ description: 'Telegram username', example: 'johndoe' })
  @IsString()
  tg_username?: string;
}

