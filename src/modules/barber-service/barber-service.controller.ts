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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { ParseFilePipe, MaxFileSizeValidator } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
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
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Yangi sartarosh xizmati yaratish (Faqat admin uchun)',
  })
  @ApiResponse({ status: 201, description: 'Xizmat muvaffaqiyatli yaratildi' })
  @ApiResponse({ status: 400, description: "Noto'g'ri so'rov" })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('image_url', {
      storage: diskStorage({
        destination: './uploads/services',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `service-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Faqat rasm fayllari qabul qilinadi (image/jpeg, image/png, image/jpg)'), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  create(
    @Body() createBarberServiceDto: CreateBarberServiceDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
        ],
      }),
    )
    file?: Express.Multer.File,
  ) {
    if (file) {
      createBarberServiceDto.image_url = `/uploads/services/${file.filename}`;
    }

    // Bo'sh string'larni undefined qilish
    if (createBarberServiceDto.image_url === '') {
      createBarberServiceDto.image_url = undefined;
    }

    return this.barberServiceService.create(createBarberServiceDto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Xizmatni tahrirlash (Faqat admin uchun)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Xizmat ID' })
  @ApiResponse({ status: 200, description: 'Xizmat muvaffaqiyatli yangilandi' })
  @ApiResponse({ status: 400, description: "Noto'g'ri so'rov" })
  @ApiResponse({ status: 404, description: 'Xizmat topilmadi' })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('image_url', {
      storage: diskStorage({
        destination: './uploads/services',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `service-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Faqat rasm fayllari qabul qilinadi (image/jpeg, image/png, image/jpg)'), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updateBarberServiceDto: UpdateBarberServiceDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
        ],
      }),
    )
    file?: Express.Multer.File,
  ) {
    const numId = +id;
    if (isNaN(numId)) {
      throw new BadRequestException("Noto'g'ri ID format");
    }

    // Agar file yuborilgan bo'lsa, eski faylni o'chirish va yangi file path'ni qo'shish
    if (file) {
      const existingService = await this.barberServiceService.findOne(numId);
      if (existingService?.image_url) {
        // Eski faylni o'chirish
        const filePath = join(process.cwd(), existingService.image_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      updateBarberServiceDto.image_url = `/uploads/services/${file.filename}`;
    }

    // Bo'sh string'larni undefined qilish
    if (updateBarberServiceDto.image_url === '') {
      updateBarberServiceDto.image_url = undefined;
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
