import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BarberServiceService } from './barber-service.service';
import { CreateBarberServiceDto } from './dto/create-barber-service.dto';
import { UpdateBarberServiceDto } from './dto/update-barber-service.dto';
import { AuthGuard, RoleGuard } from 'src/common/guards';
import { Role } from 'src/common/decorators';
import { UserRole } from 'src/common/enums/user.enum';

@Controller('barber-services')
@ApiTags('barber-services')
export class BarberServiceController {
  constructor(private readonly barberServiceService: BarberServiceService) {}

  @Get()
  @ApiOperation({ summary: 'Barcha xizmatlarni olish (Ochiq)' })
  @ApiResponse({ status: 200, description: "Barcha xizmatlar ro'yxati" })
  findAll() {
    return this.barberServiceService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: "ID bo'yicha xizmatni olish (Ochiq)" })
  @ApiParam({ name: 'id', type: 'number', description: 'Xizmat ID' })
  @ApiResponse({ status: 200, description: 'Xizmat topildi' })
  @ApiResponse({ status: 404, description: 'Xizmat topilmadi' })
  @ApiResponse({ status: 400, description: "Noto'g'ri ID format" })
  async findOne(@Param('id') id: string) {
    const numId = +id;
    if (isNaN(numId)) {
      throw new BadRequestException("Noto'g'ri ID format");
    }
    return await this.barberServiceService.findOne(numId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Yangi sartarosh xizmati yaratish (Faqat admin uchun)',
  })
  @ApiResponse({ status: 201, description: 'Xizmat muvaffaqiyatli yaratildi' })
  @ApiResponse({ status: 400, description: "Noto'g'ri so'rov" })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createBarberServiceDto: CreateBarberServiceDto) {
    return this.barberServiceService.create(createBarberServiceDto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xizmatni tahrirlash (Faqat admin uchun)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Xizmat ID' })
  @ApiResponse({ status: 200, description: 'Xizmat muvaffaqiyatli yangilandi' })
  @ApiResponse({ status: 400, description: "Noto'g'ri so'rov" })
  @ApiResponse({ status: 404, description: 'Xizmat topilmadi' })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateBarberServiceDto: UpdateBarberServiceDto,
  ) {
    const numId = +id;
    if (isNaN(numId)) {
      throw new BadRequestException("Noto'g'ri ID format");
    }
    return await this.barberServiceService.update(
      numId,
      updateBarberServiceDto,
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Xizmatni o'chirish (Faqat admin uchun)" })
  @ApiParam({ name: 'id', type: 'number', description: 'Xizmat ID' })
  @ApiResponse({ status: 204, description: "Xizmat muvaffaqiyatli o'chirildi" })
  @ApiResponse({ status: 400, description: "Noto'g'ri so'rov" })
  @ApiResponse({ status: 404, description: 'Xizmat topilmadi' })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string) {
    const numId = +id;
    if (isNaN(numId)) {
      throw new BadRequestException("Noto'g'ri ID format");
    }
    await this.barberServiceService.remove(numId);
  }
}
