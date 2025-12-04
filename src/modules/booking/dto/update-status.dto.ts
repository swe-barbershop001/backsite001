import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";
import { BookingStatus } from "src/common/enums/booking-status.enum";

export class UpdateStatusDto {
  @ApiProperty({ 
    description: 'Bron statusi', 
    example: BookingStatus.PENDING,
    enum: BookingStatus,
    enumName: 'BookingStatus'
  })
  @IsEnum(BookingStatus, {
    message: 'status must be one of: pending, approved, rejected, cancelled, completed'
  })
  @IsNotEmpty({ message: 'status bo\'sh bo\'lishi mumkin emas' })
  status: BookingStatus;
}