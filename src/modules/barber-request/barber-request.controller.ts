import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BarberRequestService } from './barber-request.service';
import { CreateBarberRequestDto } from './dto/create-barber-request.dto';

@ApiTags('barber-requests')
@Controller('barber-requests')
export class BarberRequestController {
  constructor(private readonly barberRequestService: BarberRequestService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi barber so\'rovi yaratish' })
  @ApiResponse({ status: 201, description: 'Barber so\'rovi muvaffaqiyatli yaratildi' })
  @ApiResponse({ status: 400, description: 'Noto\'g\'ri so\'rov' })
  create(@Body() createBarberRequestDto: CreateBarberRequestDto) {
    return this.barberRequestService.create(createBarberRequestDto);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha barber so\'rovlarini olish' })
  @ApiResponse({ status: 200, description: 'Barber so\'rovlari ro\'yxati' })
  findAll() {
    return this.barberRequestService.findAll();
  }

  @Get('pending')
  @ApiOperation({ summary: 'Kutilayotgan barber so\'rovlarini olish' })
  @ApiResponse({ status: 200, description: 'Kutilayotgan barber so\'rovlari ro\'yxati' })
  findPending() {
    return this.barberRequestService.findPending();
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID bo\'yicha barber so\'rovi olish' })
  @ApiParam({ name: 'id', type: 'number', description: 'Barber so\'rovi ID' })
  @ApiResponse({ status: 200, description: 'Barber so\'rovi topildi' })
  @ApiResponse({ status: 404, description: 'Barber so\'rovi topilmadi' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.barberRequestService.findOne(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Barber so\'rovini tasdiqlash' })
  @ApiParam({ name: 'id', type: 'number', description: 'Barber so\'rovi ID' })
  @ApiResponse({ status: 200, description: 'Barber so\'rovi tasdiqlandi' })
  @ApiResponse({ status: 404, description: 'Barber so\'rovi topilmadi' })
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.barberRequestService.approve(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Barber so\'rovini rad etish' })
  @ApiParam({ name: 'id', type: 'number', description: 'Barber so\'rovi ID' })
  @ApiResponse({ status: 200, description: 'Barber so\'rovi rad etildi' })
  @ApiResponse({ status: 404, description: 'Barber so\'rovi topilmadi' })
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.barberRequestService.reject(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Barber so\'rovini o\'chirish' })
  @ApiParam({ name: 'id', type: 'number', description: 'Barber so\'rovi ID' })
  @ApiResponse({ status: 200, description: 'Barber so\'rovi muvaffaqiyatli o\'chirildi' })
  @ApiResponse({ status: 404, description: 'Barber so\'rovi topilmadi' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.barberRequestService.remove(id);
  }
}

