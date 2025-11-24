import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BarbershopService } from './barbershop.service';
import { CreateBarbershopDto } from './dto/create-barbershop.dto';
import { UpdateBarbershopDto } from './dto/update-barbershop.dto';

@ApiTags('barbershops')
@Controller('barbershops')
export class BarbershopController {
  constructor(private readonly barbershopService: BarbershopService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi barbershop yaratish' })
  @ApiResponse({ status: 201, description: 'Barbershop muvaffaqiyatli yaratildi' })
  @ApiResponse({ status: 400, description: 'Noto\'g\'ri so\'rov' })
  create(@Body() createBarbershopDto: CreateBarbershopDto) {
    return this.barbershopService.create(createBarbershopDto);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha barbershoplarni olish' })
  @ApiResponse({ status: 200, description: 'Barcha barbershoplar ro\'yxati' })
  findAll() {
    return this.barbershopService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID bo\'yicha barbershop olish' })
  @ApiParam({ name: 'id', type: 'number', description: 'Barbershop ID' })
  @ApiResponse({ status: 200, description: 'Barbershop topildi' })
  @ApiResponse({ status: 404, description: 'Barbershop topilmadi' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.barbershopService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Barbershopni yangilash' })
  @ApiParam({ name: 'id', type: 'number', description: 'Barbershop ID' })
  @ApiResponse({ status: 200, description: 'Barbershop muvaffaqiyatli yangilandi' })
  @ApiResponse({ status: 404, description: 'Barbershop topilmadi' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBarbershopDto: UpdateBarbershopDto,
  ) {
    return this.barbershopService.update(id, updateBarbershopDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Barbershopni o\'chirish' })
  @ApiParam({ name: 'id', type: 'number', description: 'Barbershop ID' })
  @ApiResponse({ status: 200, description: 'Barbershop muvaffaqiyatli o\'chirildi' })
  @ApiResponse({ status: 404, description: 'Barbershop topilmadi' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.barbershopService.remove(id);
  }
}

