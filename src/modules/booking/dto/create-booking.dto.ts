import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsDateString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'Mijoz ID', example: 1 })
  @IsNumber()
  clientId: number;

  @ApiProperty({ description: 'Barber ID', example: 1 })
  @IsNumber()
  barberId: number;

  @ApiProperty({ description: 'Bron sanasi (YYYY-MM-DD)', example: '2024-12-25' })
  @IsString()
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Bron vaqti (HH:mm)', example: '14:00' })
  @IsString()
  time: string;
}

