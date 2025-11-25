import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { BarberService } from './barber.service';
import { Barber } from './entities/barber.entity';
import { CreateBarberDto } from './dto/create-barber.dto';

@ApiTags('barbers')
@Controller('barbers')
export class BarberController {
  constructor(private readonly barberService: BarberService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new barber' })
  @ApiResponse({ status: 201, description: 'Barber successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createBarberDto: CreateBarberDto) {
    return this.barberService.create(createBarberDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all barbers' })
  @ApiResponse({ status: 200, description: 'List of all barbers' })
  findAll() {
    return this.barberService.findAll();
  }

  @Get('working')
  @ApiOperation({ summary: 'Get all working barbers' })
  @ApiResponse({ status: 200, description: 'List of working barbers' })
  findWorking() {
    return this.barberService.findWorkingBarbers();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a barber by ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'Barber ID' })
  @ApiResponse({ status: 200, description: 'Barber found' })
  @ApiResponse({ status: 404, description: 'Barber not found' })
  findOne(@Param('id') id: string) {
    return this.barberService.findOne(+id);
  }

  @Patch(':id/working')
  @ApiOperation({ summary: 'Update barber working status' })
  @ApiParam({ name: 'id', type: 'number', description: 'Barber ID' })
  @ApiBody({
    schema: { type: 'object', properties: { working: { type: 'boolean' } } },
  })
  @ApiResponse({ status: 200, description: 'Working status updated' })
  @ApiResponse({ status: 404, description: 'Barber not found' })
  updateWorkingStatus(
    @Param('id') id: string,
    @Body('working') working: boolean,
  ) {
    return this.barberService.updateWorkingStatus(+id, working);
  }
}
