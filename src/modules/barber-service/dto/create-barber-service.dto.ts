import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBarberServiceDto {
  @ApiProperty({ description: 'Xizmat nomi', example: 'Haircut' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Xizmat narxi (so\'m)', example: 50000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Xizmat davomiyligi (daqiqa)', example: 30 })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiProperty({ description: 'Kategoriya ID', example: 1 })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  category_id: number;

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

