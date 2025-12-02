import { IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BookingStatisticsDto {
  @ApiProperty({
    description: 'Boshlanish sanasi (yyyy-mm-dd)',
    example: '2025-01-01',
  })
  @IsString()
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Tugash sanasi (yyyy-mm-dd)',
    example: '2025-01-31',
  })
  @IsString()
  @IsNotEmpty()
  @IsDateString()
  endDate: string;
}

