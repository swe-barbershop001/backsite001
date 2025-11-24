import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsDateString } from 'class-validator';
import { BookingStatus } from '../../../common/constants';

export class UpdateBookingDto {
  @ApiProperty({ 
    description: 'Bron holati', 
    enum: BookingStatus, 
    example: BookingStatus.APPROVED,
    required: false 
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiProperty({ description: 'Bron sanasi (YYYY-MM-DD)', example: '2024-12-25', required: false })
  @IsOptional()
  @IsString()
  @IsDateString()
  date?: string;

  @ApiProperty({ description: 'Bron vaqti (HH:mm)', example: '14:00', required: false })
  @IsOptional()
  @IsString()
  time?: string;
}

