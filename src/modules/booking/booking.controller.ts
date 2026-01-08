import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatisticsDto } from './dto/booking-statistics.dto';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { AuthGuard, RoleGuard } from 'src/common/guards';
import { Role } from 'src/common/decorators';
import { UserRole } from 'src/common/enums/user.enum';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('bookings')
@ApiTags('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('comments')
  @ApiOperation({ summary: 'Barcha izohli bronlarni olish (Ochiq)' })
  @ApiResponse({
    status: 200,
    description: 'Izohlar va foydalanuvchi ma\'lumotlari bilan bronlar ro\'yxati',
  })
  getBookingsWithComments() {
    return this.bookingService.findBookingsWithComments();
  }

  @Post()
  @ApiOperation({
    summary:
      'Bron yaratish - bitta yoki bir nechta xizmatni bitta so\'rovda (Ochiq)',
  })
  @ApiResponse({ status: 201, description: 'Bron(lar) muvaffaqiyatli yaratildi' })
  @ApiResponse({ status: 400, description: 'Noto\'g\'ri so\'rov' })
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.create(createBookingDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Barcha bronlarni olish' })
  @ApiResponse({ status: 200, description: 'Barcha bronlar ro\'yxati' })
  findAll() {
    return this.bookingService.findAll();
  }

  // @Get('client/:clientId')
  // @UseGuards(AuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Muayyan mijoz uchun barcha bronlarni olish' })
  // @ApiParam({ name: 'clientId', type: 'number', description: 'Mijoz ID' })
  // @ApiResponse({ status: 200, description: 'Mijoz uchun bronlar ro\'yxati' })
  // findByClient(@Param('clientId') clientId: string) {
  //   return this.bookingService.findByClientId(+clientId);
  // }

  // @Get('my')
  // @UseGuards(AuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Joriy foydalanuvchi bronlarini olish' })
  // @ApiResponse({ status: 200, description: 'Joriy foydalanuvchi bronlari ro\'yxati' })
  // getMyBookings(@Request() req: any) {
  //   const userId = req.user.id;
  //   return this.bookingService.findByClientId(userId);
  // }

  @Get('barber/:barberId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Muayyan sartarosh uchun barcha bronlarni olish' })
  findByBarber(@Param('barberId') barberId: string) {
    return this.bookingService.findByBarberId(+barberId);
  }

  @Get('pending')
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Barcha kutayotgan bronlarni olish (Faqat admin uchun)' })
  getPendingBookings() {
    return this.bookingService.findPendingBookings();
  }

  @Post('admin/statistics')
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin uchun booking statistikasini olish (vaqt oralig\'i bo\'yicha)',
  })
  @ApiBody({ type: BookingStatisticsDto })
  @ApiResponse({
    status: 200,
    description: 'Booking statistikasi muvaffaqiyatli qaytarildi',
  })
  @ApiResponse({
    status: 400,
    description: 'Noto\'g\'ri so\'rov (startDate > endDate)',
  })
  getStatistics(@Body() dto: BookingStatisticsDto) {
    return this.bookingService.getStatistics(dto);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Bronni ID'si bo'yicha olish" })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bookingService.findOne(+id);
  }

  // @Patch(':id/approve')
  // @UseGuards(AuthGuard, RoleGuard)
  // @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Approve a booking (Admin only)' })
  // @ApiParam({ name: 'id', type: 'number', description: 'Booking ID' })
  // @ApiResponse({ status: 200, description: 'Booking approved' })
  // @ApiResponse({ status: 404, description: 'Booking not found' })
  // approveBooking(@Param('id') id: string) {
  //   return this.bookingService.approve(+id);
  // }

  // @Patch(':id/reject')
  // @UseGuards(AuthGuard, RoleGuard)
  // @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Reject a booking (Admin only)' })
  // @ApiParam({ name: 'id', type: 'number', description: 'Booking ID' })
  // @ApiResponse({ status: 200, description: 'Booking rejected' })
  // @ApiResponse({ status: 404, description: 'Booking not found' })
  // rejectBooking(@Param('id') id: string) {
  //   return this.bookingService.reject(+id);
  // }

  @Patch(':id/status')
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bron statuslarini tahrirlash (faqat admin va super_admin uchun)',
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() status: UpdateStatusDto,
  ) {
    return this.bookingService.updateStatus(+id, status);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Bronni o'chirish (faqat admin va super_admin'lar uchun)",
  })
  @ApiResponse({
    status: 200,
    description: "Booking muvaffaqiyatli o'chirildi",
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: "Booking muvaffaqiyatli o'chirildi",
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Noto'g'ri ID format yoki booking topilmadi",
  })
  @ApiResponse({
    status: 401,
    description: 'Autentifikatsiya talab qilinadi',
  })
  @ApiResponse({
    status: 403,
    description: "Faqat admin va super_admin'lar booking o'chira oladi",
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.bookingService.remove(+id);
    return { message: "Booking muvaffaqiyatli o'chirildi" };
  }
}
