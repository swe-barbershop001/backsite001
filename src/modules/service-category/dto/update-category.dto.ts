import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiProperty({ description: 'Kategoriya nomi', example: 'Soch olish', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Kategoriya ikoni (emoji)', example: '✂️', required: false })
  @IsString()
  @IsOptional()
  icon?: string;
}

