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
import { BarberService } from './barber.service';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

@ApiTags('barbers')
@Controller('barbers')
export class BarberController {
  constructor(private readonly barberService: BarberService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi barber yaratish' })
  @ApiResponse({ status: 201, description: 'Barber muvaffaqiyatli yaratildi' })
  @ApiResponse({ status: 400, description: 'Noto\'g\'ri so\'rov' })
  create(@Body() createBarberDto: CreateBarberDto) {
    return this.barberService.create(createBarberDto);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha barberlarni olish yoki barbershop bo\'yicha filtrlash' })
  @ApiQuery({ name: 'barbershopId', required: false, type: Number, description: 'Barbershop ID bo\'yicha filtrlash' })
  @ApiResponse({ status: 200, description: 'Barberlar ro\'yxati' })
  findAll(@Query('barbershopId') barbershopId?: string) {
    if (barbershopId) {
      return this.barberService.findByBarbershop(parseInt(barbershopId, 10));
    }
    return this.barberService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID bo\'yicha barber olish' })
  @ApiParam({ name: 'id', type: 'number', description: 'Barber ID' })
  @ApiResponse({ status: 200, description: 'Barber topildi' })
  @ApiResponse({ status: 404, description: 'Barber topilmadi' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.barberService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Barberni yangilash' })
  @ApiParam({ name: 'id', type: 'number', description: 'Barber ID' })
  @ApiResponse({ status: 200, description: 'Barber muvaffaqiyatli yangilandi' })
  @ApiResponse({ status: 404, description: 'Barber topilmadi' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBarberDto: UpdateBarberDto,
  ) {
    return this.barberService.update(id, updateBarberDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Barberni o\'chirish' })
  @ApiParam({ name: 'id', type: 'number', description: 'Barber ID' })
  @ApiResponse({ status: 200, description: 'Barber muvaffaqiyatli o\'chirildi' })
  @ApiResponse({ status: 404, description: 'Barber topilmadi' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.barberService.remove(id);
  }
}

