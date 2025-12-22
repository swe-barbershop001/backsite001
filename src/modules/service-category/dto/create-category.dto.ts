import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Kategoriya nomi', example: 'Soch olish' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Kategoriya ikoni (emoji)', example: '✂️', required: false })
  @IsString()
  @IsOptional()
  icon?: string;
}

