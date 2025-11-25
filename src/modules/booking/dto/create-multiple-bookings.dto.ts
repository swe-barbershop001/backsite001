import { IsNumber, IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '../../../common/enums/booking-status.enum';

export class CreateMultipleBookingsDto {
  @ApiProperty({ description: 'Client ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  client_id: number;

  @ApiProperty({ description: 'Barber ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  barber_id: number;

  @ApiProperty({ 
    description: 'Service IDs array', 
    example: [1, 2, 3],
    type: [Number]
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  service_ids: number[];

  @ApiProperty({ description: 'Booking date (yyyy-mm-dd)', example: '2025-01-25' })
  @IsString()
  @IsNotEmpty()
  date: string; // yyyy-mm-dd

  @ApiProperty({ description: 'Booking time (HH:mm)', example: '14:00' })
  @IsString()
  @IsNotEmpty()
  time: string; // HH:mm

  @ApiPropertyOptional({ 
    description: 'Booking status', 
    enum: BookingStatus,
    default: BookingStatus.APPROVED,
    example: BookingStatus.APPROVED
  })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;
}

