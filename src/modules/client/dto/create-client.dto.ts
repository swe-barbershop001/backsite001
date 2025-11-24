import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ description: 'Telegram foydalanuvchi ID', example: 123456789 })
  @IsNumber()
  tgId: number;

  @ApiProperty({ description: 'To\'liq ism', example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ description: 'Telegram username', example: 'johndoe', required: false })
  @IsOptional()
  @IsString()
  username?: string;
}

