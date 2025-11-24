import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateClientDto {
  @ApiProperty({ description: 'To\'liq ism', example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ description: 'Telegram username', example: 'johndoe', required: false })
  @IsOptional()
  @IsString()
  username?: string;
}

