import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BarberServiceService } from './barber-service.service';
import { CreateBarberServiceDto } from './dto/create-barber-service.dto';

@ApiTags('barber-services')
@Controller('barber-services')
export class BarberServiceController {
  constructor(
    private readonly barberServiceService: BarberServiceService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new barber service' })
  @ApiResponse({ status: 201, description: 'Service successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createBarberServiceDto: CreateBarberServiceDto) {
    return this.barberServiceService.create(createBarberServiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all services' })
  @ApiResponse({ status: 200, description: 'List of all services' })
  findAll() {
    return this.barberServiceService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service by ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service found' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  findOne(@Param('id') id: string) {
    return this.barberServiceService.findOne(+id);
  }
}

