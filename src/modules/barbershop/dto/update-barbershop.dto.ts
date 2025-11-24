import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBarbershopDto {
  @ApiProperty({ description: 'Barbershop nomi', example: 'Downtown Barbershop', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ 
    description: 'Kenglik (Latitude)', 
    example: 41.311081, 
    required: false,
    minimum: -90,
    maximum: 90
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ 
    description: 'Uzunlik (Longitude)', 
    example: 69.240562, 
    required: false,
    minimum: -180,
    maximum: 180
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

