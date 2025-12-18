import { IsString, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBarberServiceDto {
  @ApiProperty({ description: 'Xizmat nomi', example: 'Haircut', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Xizmat narxi (so\'m)', example: 50000, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiProperty({ description: 'Xizmat davomiyligi (daqiqa)', example: 30, required: false })
  @IsNumber()
  @Min(1)
  @IsOptional()
  duration?: number;
}

