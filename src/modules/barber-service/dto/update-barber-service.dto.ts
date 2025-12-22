import { IsString, IsNumber, Min, IsOptional, IsPositive } from 'class-validator';
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

  @ApiProperty({ description: 'Kategoriya ID', example: 1, required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  category_id?: number;

  @ApiProperty({ 
    description: 'Xizmat rasmi', 
    type: 'string',
    format: 'binary',
    required: false 
  })
  @IsString()
  @IsOptional()
  image_url?: string;
}

