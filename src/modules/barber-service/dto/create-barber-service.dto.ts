import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBarberServiceDto {
  @ApiProperty({ description: 'Service name', example: 'Haircut' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Service price in som', example: 50000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Service duration in minutes', example: 30 })
  @IsNumber()
  @Min(1)
  duration: number;
}

