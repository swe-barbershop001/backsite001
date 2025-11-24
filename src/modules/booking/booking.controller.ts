import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@ApiTags('bookings')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi bron yaratish' })
  @ApiResponse({ status: 201, description: 'Bron muvaffaqiyatli yaratildi' })
  @ApiResponse({ status: 400, description: 'Noto\'g\'ri so\'rov' })
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.create(createBookingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha bronlarni olish yoki barber/mijoz bo\'yicha filtrlash' })
  @ApiQuery({ name: 'barberId', required: false, type: Number, description: 'Barber ID bo\'yicha filtrlash' })
  @ApiQuery({ name: 'clientId', required: false, type: Number, description: 'Mijoz ID bo\'yicha filtrlash' })
  @ApiResponse({ status: 200, description: 'Bronlar ro\'yxati' })
  findAll(
    @Query('barberId') barberId?: string,
    @Query('clientId') clientId?: string,
  ) {
    if (barberId) {
      return this.bookingService.findByBarber(parseInt(barberId, 10));
    }
    if (clientId) {
      return this.bookingService.findByClient(parseInt(clientId, 10));
    }
    return this.bookingService.findAll();
  }

  @Get('available-slots')
  @ApiOperation({ summary: 'Barber uchun belgilangan sanada mavjud vaqtlarni olish' })
  @ApiQuery({ name: 'barberId', type: Number, description: 'Barber ID' })
  @ApiQuery({ name: 'date', type: String, description: 'Sana (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Mavjud vaqtlar ro\'yxati' })
  getAvailableSlots(
    @Query('barberId', ParseIntPipe) barberId: number,
    @Query('date') date: string,
  ) {
    return this.bookingService.getAvailableTimeSlots(barberId, date);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID bo\'yicha bron olish' })
  @ApiParam({ name: 'id', type: 'number', description: 'Bron ID' })
  @ApiResponse({ status: 200, description: 'Bron topildi' })
  @ApiResponse({ status: 404, description: 'Bron topilmadi' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bookingService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Bronni yangilash' })
  @ApiParam({ name: 'id', type: 'number', description: 'Bron ID' })
  @ApiResponse({ status: 200, description: 'Bron muvaffaqiyatli yangilandi' })
  @ApiResponse({ status: 404, description: 'Bron topilmadi' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingService.update(id, updateBookingDto);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Bronni tasdiqlash' })
  @ApiParam({ name: 'id', type: 'number', description: 'Bron ID' })
  @ApiResponse({ status: 200, description: 'Bron muvaffaqiyatli tasdiqlandi' })
  @ApiResponse({ status: 404, description: 'Bron topilmadi' })
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.bookingService.approve(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Bronni rad etish' })
  @ApiParam({ name: 'id', type: 'number', description: 'Bron ID' })
  @ApiResponse({ status: 200, description: 'Bron muvaffaqiyatli rad etildi' })
  @ApiResponse({ status: 404, description: 'Bron topilmadi' })
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.bookingService.reject(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Bronni o\'chirish' })
  @ApiParam({ name: 'id', type: 'number', description: 'Bron ID' })
  @ApiResponse({ status: 200, description: 'Bron muvaffaqiyatli o\'chirildi' })
  @ApiResponse({ status: 404, description: 'Bron topilmadi' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bookingService.remove(id);
  }
}

