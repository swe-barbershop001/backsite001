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
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { AuthGuard, RoleGuard } from 'src/common/guards';
import { Role } from 'src/common/decorators';
import { UserRole } from 'src/common/enums/user.enum';

@Controller('bookings')
@ApiTags('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('comments')
  @ApiOperation({ summary: 'Get all bookings with comments (Public)' })
  @ApiResponse({
    status: 200,
    description: 'List of bookings with comments and user information',
  })
  getBookingsWithComments() {
    return this.bookingService.findBookingsWithComments();
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create booking(s) - single or multiple services in one request' })
  @ApiResponse({ status: 201, description: 'Booking(s) successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.create(createBookingDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all bookings' })
  @ApiResponse({ status: 200, description: 'List of all bookings' })
  findAll() {
    return this.bookingService.findAll();
  }

  @Get('client/:clientId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all bookings for a specific client' })
  @ApiParam({ name: 'clientId', type: 'number', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'List of bookings for the client' })
  findByClient(@Param('clientId') clientId: string) {
    return this.bookingService.findByClientId(+clientId);
  }

  @Get('my')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user bookings' })
  @ApiResponse({ status: 200, description: 'List of current user bookings' })
  getMyBookings(@Request() req: any) {
    const userId = req.user.id;
    return this.bookingService.findByClientId(userId);
  }

  @Get('barber/:barberId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all bookings for a specific barber' })
  @ApiParam({ name: 'barberId', type: 'number', description: 'Barber ID' })
  @ApiResponse({ status: 200, description: 'List of bookings for the barber' })
  findByBarber(@Param('barberId') barberId: string) {
    return this.bookingService.findByBarberId(+barberId);
  }

  @Get('pending')
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pending bookings (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of pending bookings' })
  getPendingBookings() {
    return this.bookingService.findPendingBookings();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking found' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(+id);
  }

  @Patch(':id/approve')
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a booking (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking approved' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  approveBooking(@Param('id') id: string) {
    return this.bookingService.approve(+id);
  }

  @Patch(':id/reject')
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a booking (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking rejected' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  rejectBooking(@Param('id') id: string) {
    return this.bookingService.reject(+id);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update booking status (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Booking ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'approved', 'rejected', 'cancelled'],
          description: 'Booking status',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Booking status updated' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  updateStatus(@Param('id') id: string, @Body('status') status: BookingStatus) {
    return this.bookingService.updateStatus(+id, status);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a booking' })
  @ApiParam({ name: 'id', type: 'number', description: 'Booking ID' })
  @ApiResponse({ status: 204, description: 'Booking successfully deleted' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async remove(@Param('id') id: string) {
    await this.bookingService.remove(+id);
  }
}
