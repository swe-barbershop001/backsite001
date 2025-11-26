import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BarberServiceService } from './barber-service.service';
import { CreateBarberServiceDto } from './dto/create-barber-service.dto';
import { AuthGuard } from 'src/common/guards';

@Controller('barber-services')
@ApiTags('barber-services')
export class BarberServiceController {
  constructor(private readonly barberServiceService: BarberServiceService) {}

  @Get()
  @ApiOperation({ summary: 'Get all services (Public)' })
  @ApiResponse({ status: 200, description: 'List of all services' })
  findAll() {
    return this.barberServiceService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service by ID (Public)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service found' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  findOne(@Param('id') id: string) {
    return this.barberServiceService.findOne(+id);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new barber service' })
  @ApiResponse({ status: 201, description: 'Service successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createBarberServiceDto: CreateBarberServiceDto) {
    return this.barberServiceService.create(createBarberServiceDto);
  }
}
