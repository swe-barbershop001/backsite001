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
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('clients')
@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi mijoz yaratish' })
  @ApiResponse({ status: 201, description: 'Mijoz muvaffaqiyatli yaratildi' })
  @ApiResponse({ status: 400, description: 'Noto\'g\'ri so\'rov' })
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientService.create(createClientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha mijozlarni olish' })
  @ApiResponse({ status: 200, description: 'Barcha mijozlar ro\'yxati' })
  findAll() {
    return this.clientService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID bo\'yicha mijoz olish' })
  @ApiParam({ name: 'id', type: 'number', description: 'Mijoz ID' })
  @ApiResponse({ status: 200, description: 'Mijoz topildi' })
  @ApiResponse({ status: 404, description: 'Mijoz topilmadi' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mijozni yangilash' })
  @ApiParam({ name: 'id', type: 'number', description: 'Mijoz ID' })
  @ApiResponse({ status: 200, description: 'Mijoz muvaffaqiyatli yangilandi' })
  @ApiResponse({ status: 404, description: 'Mijoz topilmadi' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientService.update(id, updateClientDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Mijozni o\'chirish' })
  @ApiParam({ name: 'id', type: 'number', description: 'Mijoz ID' })
  @ApiResponse({ status: 200, description: 'Mijoz muvaffaqiyatli o\'chirildi' })
  @ApiResponse({ status: 404, description: 'Mijoz topilmadi' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.remove(id);
  }
}

