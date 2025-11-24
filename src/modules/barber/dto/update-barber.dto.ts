import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateBarberDto {
  @ApiProperty({ description: 'Barber ismi', example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Telegram foydalanuvchi ID', example: 123456789, required: false })
  @IsOptional()
  @IsNumber()
  tgId?: number;

  @ApiProperty({ description: 'Barbershop ID', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  barbershopId?: number;
}

