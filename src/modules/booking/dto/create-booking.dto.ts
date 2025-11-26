import { IsNumber, IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '../../../common/enums/booking-status.enum';

export class CreateBookingDto {
  @ApiProperty({ description: 'Client ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  client_id: number;

  @ApiProperty({ description: 'Barber ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  barber_id: number;

  @ApiProperty({ description: 'Service ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  service_id: number;

  @ApiProperty({ description: 'Booking date (yyyy-mm-dd)', example: '2025-01-25' })
  @IsString()
  @IsNotEmpty()
  date: string; // yyyy-mm-dd

  @ApiProperty({ description: 'Booking time (HH:mm)', example: '14:00' })
  @IsString()
  @IsNotEmpty()
  time: string; // HH:mm

  // Status client tomonidan yuborilmaydi, har doim PENDING bo'ladi
}

