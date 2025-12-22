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
import { ServiceCategoryService } from './service-category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AuthGuard, RoleGuard } from 'src/common/guards';
import { Role } from 'src/common/decorators';
import { UserRole } from 'src/common/enums/user.enum';

@Controller('service-categories')
@ApiTags('service-categories')
export class ServiceCategoryController {
  constructor(private readonly categoryService: ServiceCategoryService) {}

  @Get()
  @ApiOperation({ summary: 'Barcha kategoriyalarni olish (Ochiq)' })
  @ApiResponse({ status: 200, description: "Barcha kategoriyalar ro'yxati" })
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: "ID bo'yicha kategoriyani olish (Ochiq)" })
  @ApiParam({ name: 'id', type: 'number', description: 'Kategoriya ID' })
  @ApiResponse({ status: 200, description: 'Kategoriya topildi' })
  @ApiResponse({ status: 404, description: 'Kategoriya topilmadi' })
  @ApiResponse({ status: 400, description: "Noto'g'ri ID format" })
  async findOne(@Param('id') id: string) {
    const numId = +id;
    if (isNaN(numId)) {
      throw new BadRequestException("Noto'g'ri ID format");
    }
    return await this.categoryService.findOne(numId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Yangi xizmat kategoriyasi yaratish (Faqat admin uchun)',
  })
  @ApiResponse({ status: 201, description: 'Kategoriya muvaffaqiyatli yaratildi' })
  @ApiResponse({ status: 400, description: "Noto'g'ri so'rov" })
  @ApiResponse({ status: 409, description: 'Bir xil nomli kategoriya mavjud' })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kategoriyani tahrirlash (Faqat admin uchun)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Kategoriya ID' })
  @ApiResponse({ status: 200, description: 'Kategoriya muvaffaqiyatli yangilandi' })
  @ApiResponse({ status: 400, description: "Noto'g'ri so'rov" })
  @ApiResponse({ status: 404, description: 'Kategoriya topilmadi' })
  @ApiResponse({ status: 409, description: 'Bir xil nomli kategoriya mavjud' })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const numId = +id;
    if (isNaN(numId)) {
      throw new BadRequestException("Noto'g'ri ID format");
    }
    return await this.categoryService.update(numId, updateCategoryDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Kategoriyani o'chirish (Faqat admin uchun)" })
  @ApiParam({ name: 'id', type: 'number', description: 'Kategoriya ID' })
  @ApiResponse({ status: 204, description: "Kategoriya muvaffaqiyatli o'chirildi" })
  @ApiResponse({ status: 400, description: "Noto'g'ri so'rov yoki kategoriyada xizmatlar mavjud" })
  @ApiResponse({ status: 404, description: 'Kategoriya topilmadi' })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string) {
    const numId = +id;
    if (isNaN(numId)) {
      throw new BadRequestException("Noto'g'ri ID format");
    }
    await this.categoryService.remove(numId);
  }
}

