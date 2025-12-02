import { IsNumber, IsString, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '../../../common/enums/booking-status.enum';

export class CreateBookingDto {
  @ApiProperty({ description: 'Mijoz telefon raqami', example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({ description: 'Sartarosh ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  barber_id: number;

  @ApiProperty({ 
    description: 'Xizmat ID lar massivi (bitta yoki bir nechta xizmat)', 
    example: [1],
    type: [Number]
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  service_ids: number[];

  @ApiProperty({ description: 'Bron sanasi (yyyy-mm-dd)', example: '2025-01-25' })
  @IsString()
  @IsNotEmpty()
  date: string; // yyyy-mm-dd

  @ApiProperty({ description: 'Bron vaqti (HH:mm)', example: '14:00' })
  @IsString()
  @IsNotEmpty()
  time: string; // HH:mm

  @ApiProperty({ description: 'Mijoz ismi (ixtiyoriy)', example: 'John Doe', required: false })
  @IsString()
  client_name?: string; // Mijoz ismi

  // Status client tomonidan yuborilmaydi, har doim PENDING bo'ladi
}

