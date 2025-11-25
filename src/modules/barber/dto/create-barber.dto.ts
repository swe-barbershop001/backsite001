import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBarberDto {
  @ApiProperty({ description: 'Barber name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Telegram user ID', example: '123456789' })
  @IsString()
  @IsOptional()
  tg_id?: string;

  @ApiPropertyOptional({ description: 'Telegram username', example: 'johndoe' })
  @IsString()
  @IsOptional()
  tg_username?: string;

  @ApiPropertyOptional({ description: 'Working status', example: false, default: false })
  @IsBoolean()
  @IsOptional()
  working?: boolean;
}

