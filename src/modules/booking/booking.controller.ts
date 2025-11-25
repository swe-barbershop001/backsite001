import { Controller, Get, Post, Body, Param, Patch, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateMultipleBookingsDto } from './dto/create-multiple-bookings.dto';
import { BookingStatus } from '../../common/enums/booking-status.enum';

@ApiTags('bookings')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking (single service)' })
  @ApiResponse({ status: 201, description: 'Booking successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.create(createBookingDto);
  }

  @Post('multiple')
  @ApiOperation({ summary: 'Create multiple bookings (multiple services)' })
  @ApiResponse({ status: 201, description: 'Bookings successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  createMultiple(@Body() createMultipleBookingsDto: CreateMultipleBookingsDto) {
    return this.bookingService.createMultiple(createMultipleBookingsDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bookings' })
  @ApiResponse({ status: 200, description: 'List of all bookings' })
  findAll() {
    return this.bookingService.findAll();
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Get all bookings for a specific client' })
  @ApiParam({ name: 'clientId', type: 'number', description: 'Client ID' })
  @ApiResponse({ status: 200, description: 'List of bookings for the client' })
  findByClient(@Param('clientId') clientId: string) {
    return this.bookingService.findByClientId(+clientId);
  }

  @Get('barber/:barberId')
  @ApiOperation({ summary: 'Get all bookings for a specific barber' })
  @ApiParam({ name: 'barberId', type: 'number', description: 'Barber ID' })
  @ApiResponse({ status: 200, description: 'List of bookings for the barber' })
  findByBarber(@Param('barberId') barberId: string) {
    return this.bookingService.findByBarberId(+barberId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking found' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(+id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update booking status' })
  @ApiParam({ name: 'id', type: 'number', description: 'Booking ID' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        status: { 
          type: 'string', 
          enum: ['pending', 'approved', 'rejected', 'cancelled'],
          description: 'Booking status'
        } 
      } 
    } 
  })
  @ApiResponse({ status: 200, description: 'Booking status updated' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: BookingStatus,
  ) {
    return this.bookingService.updateStatus(+id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a booking' })
  @ApiParam({ name: 'id', type: 'number', description: 'Booking ID' })
  @ApiResponse({ status: 204, description: 'Booking successfully deleted' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async remove(@Param('id') id: string) {
    await this.bookingService.remove(+id);
  }
}

