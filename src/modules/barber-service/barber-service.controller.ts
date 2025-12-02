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
import { AuthGuard, RoleGuard } from 'src/common/guards';
import { Role } from 'src/common/decorators';
import { UserRole } from 'src/common/enums/user.enum';

@Controller('barber-services')
@ApiTags('barber-services')
export class BarberServiceController {
  constructor(private readonly barberServiceService: BarberServiceService) {}

  @Get()
  @ApiOperation({ summary: 'Barcha xizmatlarni olish (Ochiq)' })
  @ApiResponse({ status: 200, description: 'Barcha xizmatlar ro\'yxati' })
  findAll() {
    return this.barberServiceService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID bo\'yicha xizmatni olish (Ochiq)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Xizmat ID' })
  @ApiResponse({ status: 200, description: 'Xizmat topildi' })
  @ApiResponse({ status: 404, description: 'Xizmat topilmadi' })
  findOne(@Param('id') id: string) {
    return this.barberServiceService.findOne(+id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Yangi sartarosh xizmati yaratish' })
  @ApiResponse({ status: 201, description: 'Xizmat muvaffaqiyatli yaratildi' })
  @ApiResponse({ status: 400, description: 'Noto\'g\'ri so\'rov' })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createBarberServiceDto: CreateBarberServiceDto) {
    return this.barberServiceService.create(createBarberServiceDto);
  }
}
