import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';

export class CreateBarberDto {
  @ApiProperty({ description: 'Barber ismi', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Telegram foydalanuvchi ID', example: 123456789 })
  @IsNumber()
  tgId: number;

  @ApiProperty({ description: 'Barbershop ID', example: 1 })
  @IsNumber()
  barbershopId: number;
}

