import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { BarberService } from './barber.service';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';
import { AuthGuard, RoleGuard } from '../../common/guards';
import { UserRole } from '../../common/enums/user.enum';
import { Role } from '../../common/decorators';
import { TokenPayload } from '../../modules/auth/auth.service';

@Controller('barber')
@ApiTags('Barber')
export class BarberController {
  constructor(private readonly barberService: BarberService) {}

  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Yangi barber (sartarosh) yaratish',
    description:
      'Faqat ADMIN yoki SUPER_ADMIN yangi barber yarata oladi. Barber yaratish uchun ism talab qilinadi, qolgan maydonlar ixtiyoriy. Profile rasm fayli ixtiyoriy.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          description: 'Barber ismi (kamida 2 belgi)',
          example: 'Ahmad Karimov',
          minLength: 2,
        },
        phone_number: {
          type: 'string',
          description: 'Telefon raqami (E.164 formatida, ixtiyoriy)',
          example: '+998901234567',
          pattern: '^\\+?[1-9]\\d{1,14}$',
        },
        tg_id: {
          type: 'string',
          description: 'Telegram ID (ixtiyoriy)',
          example: '123456789',
        },
        tg_username: {
          type: 'string',
          description: 'Telegram foydalanuvchi nomi (@ belgisiz, ixtiyoriy)',
          example: 'ahmad_barber',
        },
        password: {
          type: 'string',
          description: 'Parol (kamida 4 belgi, ixtiyoriy)',
          example: 'password123',
          minLength: 4,
        },
        working: {
          type: 'boolean',
          description: 'Sartarosh ishlayaptimi? (ixtiyoriy, default: false)',
          example: false,
        },
        work_start_time: {
          type: 'string',
          description: 'Ish boshlash vaqti (HH:mm formatida, ixtiyoriy)',
          example: '09:00',
          pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
        },
        work_end_time: {
          type: 'string',
          description: 'Ish tugash vaqti (HH:mm formatida, ixtiyoriy)',
          example: '18:00',
          pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
        },
        profile_image: {
          type: 'string',
          format: 'binary',
          description: 'Profile rasm fayli (image/jpeg, image/png, image/jpg, maksimal 50MB) - ixtiyoriy',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Barber muvaffaqiyatli yaratildi',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1, description: 'Barber ID' },
        name: { type: 'string', example: 'Ahmad Karimov', description: 'Barber ismi' },
        phone_number: { type: 'string', nullable: true, example: '+998901234567', description: 'Telefon raqami' },
        tg_id: { type: 'string', nullable: true, example: '123456789', description: 'Telegram ID' },
        tg_username: { type: 'string', nullable: true, example: 'ahmad_barber', description: 'Telegram username' },
        role: { type: 'string', enum: ['barber'], example: 'barber', description: 'Foydalanuvchi roli' },
        working: { type: 'boolean', nullable: true, example: false, description: 'Ishlayaptimi?' },
        work_start_time: { type: 'string', nullable: true, example: '09:00', description: 'Ish boshlash vaqti' },
        work_end_time: { type: 'string', nullable: true, example: '18:00', description: 'Ish tugash vaqti' },
        profile_image: { type: 'string', nullable: true, example: '/uploads/profiles/barber-123.jpg', description: 'Profile rasm yo\'li' },
        created_at: { type: 'string', format: 'date-time', example: '2025-01-25T10:00:00.000Z', description: 'Yaratilgan sana' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Noto'g'ri so'rov - talab qilinadigan maydonlar to'ldirilmagan yoki noto'g'ri format",
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Ism talab qilinadi' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Autentifikatsiya talab qilinadi - Token yuborilmagan yoki noto\'g\'ri',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Taqiqlangan - Faqat ADMIN yoki SUPER_ADMIN yangi barber yarata oladi',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Faqat ADMIN yoki SUPER_ADMIN yangi sartarosh yarata oladi' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Telefon raqam, telegram ID yoki telegram username allaqachon mavjud',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Bu telefon raqam allaqachon mavjud' },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('profile_image', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `barber-${uniqueSuffix}${ext}`);
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
  async create(
    @Body() createBarberDto: CreateBarberDto,
    @Request() req: ExpressRequest & { user: TokenPayload },
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
        ],
      }),
    )
    file?: Express.Multer.File | undefined,
  ) {
    if (file) {
      createBarberDto.profile_image = `/uploads/profiles/${file.filename}`;
    }

    // Bo'sh string'larni undefined qilish
    if (createBarberDto.work_start_time === '') {
      createBarberDto.work_start_time = undefined;
    }
    if (createBarberDto.work_end_time === '') {
      createBarberDto.work_end_time = undefined;
    }
    if (createBarberDto.profile_image === '') {
      createBarberDto.profile_image = undefined;
    }
    if (createBarberDto.tg_username === '') {
      createBarberDto.tg_username = undefined;
    }
    if (createBarberDto.phone_number === '') {
      createBarberDto.phone_number = undefined;
    }
    if (createBarberDto.tg_id === '') {
      createBarberDto.tg_id = undefined;
    }
    if (createBarberDto.password === '') {
      createBarberDto.password = undefined;
    }

    return this.barberService.createBarber(createBarberDto, req.user);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Barcha barberlar ro\'yxatini olish',
    description: 'Faqat ADMIN yoki SUPER_ADMIN barcha barberlar ro\'yxatini ko\'ra oladi.',
  })
  @ApiResponse({
    status: 200,
    description: 'Barcha barberlar ro\'yxati',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1, description: 'Barber ID' },
          name: { type: 'string', example: 'Ahmad Karimov', description: 'Barber ismi' },
          phone_number: { type: 'string', nullable: true, example: '+998901234567', description: 'Telefon raqami' },
          tg_id: { type: 'string', nullable: true, example: '123456789', description: 'Telegram ID' },
          tg_username: { type: 'string', nullable: true, example: 'ahmad_barber', description: 'Telegram username' },
          role: { type: 'string', enum: ['barber'], example: 'barber', description: 'Foydalanuvchi roli' },
          working: { type: 'boolean', nullable: true, example: false, description: 'Ishlayaptimi?' },
          work_start_time: { type: 'string', nullable: true, example: '09:00', description: 'Ish boshlash vaqti' },
          work_end_time: { type: 'string', nullable: true, example: '18:00', description: 'Ish tugash vaqti' },
          profile_image: { type: 'string', nullable: true, example: '/uploads/profiles/barber-123.jpg', description: 'Profile rasm yo\'li' },
          created_at: { type: 'string', format: 'date-time', example: '2025-01-25T10:00:00.000Z', description: 'Yaratilgan sana' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Autentifikatsiya talab qilinadi - Token yuborilmagan yoki noto\'g\'ri',
  })
  @ApiResponse({
    status: 403,
    description: 'Taqiqlangan - Faqat ADMIN yoki SUPER_ADMIN barcha barberlar ro\'yxatini ko\'ra oladi',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll() {
    return this.barberService.findAllBarbers();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Barber ID bo\'yicha olish',
    description: 'Faqat ADMIN yoki SUPER_ADMIN barber ma\'lumotlarini ko\'ra oladi.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Barber ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Barber topildi',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1, description: 'Barber ID' },
        name: { type: 'string', example: 'Ahmad Karimov', description: 'Barber ismi' },
        phone_number: { type: 'string', nullable: true, example: '+998901234567', description: 'Telefon raqami' },
        tg_id: { type: 'string', nullable: true, example: '123456789', description: 'Telegram ID' },
        tg_username: { type: 'string', nullable: true, example: 'ahmad_barber', description: 'Telegram username' },
        role: { type: 'string', enum: ['barber'], example: 'barber', description: 'Foydalanuvchi roli' },
        working: { type: 'boolean', nullable: true, example: false, description: 'Ishlayaptimi?' },
        work_start_time: { type: 'string', nullable: true, example: '09:00', description: 'Ish boshlash vaqti' },
        work_end_time: { type: 'string', nullable: true, example: '18:00', description: 'Ish tugash vaqti' },
        profile_image: { type: 'string', nullable: true, example: '/uploads/profiles/barber-123.jpg', description: 'Profile rasm yo\'li' },
        created_at: { type: 'string', format: 'date-time', example: '2025-01-25T10:00:00.000Z', description: 'Yaratilgan sana' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Noto'g'ri ID format",
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Noto\'g\'ri ID format' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Autentifikatsiya talab qilinadi - Token yuborilmagan yoki noto\'g\'ri',
  })
  @ApiResponse({
    status: 403,
    description: 'Taqiqlangan - Faqat ADMIN yoki SUPER_ADMIN barber ma\'lumotlarini ko\'ra oladi',
  })
  @ApiResponse({
    status: 404,
    description: 'Barber topilmadi',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'ID 1 bilan barber topilmadi' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.barberService.findBarberById(+id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Barber ma\'lumotlarini yangilash',
    description:
      'ADMIN va SUPER_ADMIN barcha barberlarni yangilay oladi, BARBER faqat o\'zining ma\'lumotlarini yangilay oladi. Profile rasm fayli ixtiyoriy.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', type: 'number', description: 'Barber ID', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Barber ismi (kamida 2 belgi, ixtiyoriy)',
          example: 'Ahmad Karimov',
          minLength: 2,
        },
        phone_number: {
          type: 'string',
          description: 'Telefon raqami (E.164 formatida, ixtiyoriy)',
          example: '+998901234567',
          pattern: '^\\+?[1-9]\\d{1,14}$',
        },
        tg_id: {
          type: 'string',
          description: 'Telegram ID (ixtiyoriy)',
          example: '123456789',
        },
        tg_username: {
          type: 'string',
          description: 'Telegram foydalanuvchi nomi (@ belgisiz, ixtiyoriy)',
          example: 'ahmad_barber',
        },
        password: {
          type: 'string',
          description: 'Parol (kamida 4 belgi, ixtiyoriy)',
          example: 'password123',
          minLength: 4,
        },
        working: {
          type: 'boolean',
          description: 'Sartarosh ishlayaptimi? (ixtiyoriy)',
          example: false,
        },
        work_start_time: {
          type: 'string',
          description: 'Ish boshlash vaqti (HH:mm formatida, ixtiyoriy)',
          example: '09:00',
          pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
        },
        work_end_time: {
          type: 'string',
          description: 'Ish tugash vaqti (HH:mm formatida, ixtiyoriy)',
          example: '18:00',
          pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
        },
        profile_image: {
          type: 'string',
          format: 'binary',
          description: 'Profile rasm fayli (image/jpeg, image/png, image/jpg, maksimal 50MB) - ixtiyoriy',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Barber muvaffaqiyatli yangilandi',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1, description: 'Barber ID' },
        name: { type: 'string', example: 'Ahmad Karimov', description: 'Barber ismi' },
        phone_number: { type: 'string', nullable: true, example: '+998901234567', description: 'Telefon raqami' },
        tg_id: { type: 'string', nullable: true, example: '123456789', description: 'Telegram ID' },
        tg_username: { type: 'string', nullable: true, example: 'ahmad_barber', description: 'Telegram username' },
        role: { type: 'string', enum: ['barber'], example: 'barber', description: 'Foydalanuvchi roli' },
        working: { type: 'boolean', nullable: true, example: false, description: 'Ishlayaptimi?' },
        work_start_time: { type: 'string', nullable: true, example: '09:00', description: 'Ish boshlash vaqti' },
        work_end_time: { type: 'string', nullable: true, example: '18:00', description: 'Ish tugash vaqti' },
        profile_image: { type: 'string', nullable: true, example: '/uploads/profiles/barber-123.jpg', description: 'Profile rasm yo\'li' },
        created_at: { type: 'string', format: 'date-time', example: '2025-01-25T10:00:00.000Z', description: 'Yaratilgan sana' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Noto'g'ri so'rov - talab qilinadigan maydonlar to'ldirilmagan yoki noto'g'ri format",
  })
  @ApiResponse({
    status: 401,
    description: 'Autentifikatsiya talab qilinadi - Token yuborilmagan yoki noto\'g\'ri',
  })
  @ApiResponse({
    status: 403,
    description: 'Taqiqlangan - Barber faqat o\'zining ma\'lumotlarini yangilay oladi, ADMIN va SUPER_ADMIN barcha barberlarni yangilay oladi',
  })
  @ApiResponse({
    status: 404,
    description: 'Barber topilmadi',
  })
  @ApiResponse({
    status: 409,
    description: 'Telefon raqam, telegram ID yoki telegram username allaqachon mavjud',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.BARBER)
  @UseInterceptors(
    FileInterceptor('profile_image', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `barber-${uniqueSuffix}${ext}`);
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
    @Body() updateBarberDto: UpdateBarberDto,
    @Request() req: ExpressRequest & { user: TokenPayload },
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
        ],
      }),
    )
    file?: Express.Multer.File | undefined,
  ) {
    // Agar file yuborilgan bo'lsa, eski faylni o'chirish va yangi file path'ni qo'shish
    if (file) {
      const existingBarber = await this.barberService.findBarberById(+id);
      if (existingBarber.profile_image) {
        // Eski faylni o'chirish
        const filePath = join(process.cwd(), existingBarber.profile_image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      updateBarberDto.profile_image = `/uploads/profiles/${file.filename}`;
    }

    // Bo'sh string'larni undefined qilish
    if (updateBarberDto.work_start_time === '') {
      updateBarberDto.work_start_time = undefined;
    }
    if (updateBarberDto.work_end_time === '') {
      updateBarberDto.work_end_time = undefined;
    }
    if (updateBarberDto.profile_image === '') {
      updateBarberDto.profile_image = undefined;
    }
    if (updateBarberDto.tg_username === '') {
      updateBarberDto.tg_username = undefined;
    }
    if (updateBarberDto.phone_number === '') {
      updateBarberDto.phone_number = undefined;
    }
    if (updateBarberDto.tg_id === '') {
      updateBarberDto.tg_id = undefined;
    }
    if (updateBarberDto.password === '') {
      updateBarberDto.password = undefined;
    }

    return this.barberService.updateBarber(+id, updateBarberDto, req.user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Barberni o\'chirish',
    description: 'ADMIN va SUPER_ADMIN barcha barberlarni o\'chira oladi, BARBER faqat o\'zining ma\'lumotlarini o\'chira oladi.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Barber ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Barber muvaffaqiyatli o\'chirildi',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Barber muvaffaqiyatli o\'chirildi' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Noto'g'ri ID format",
  })
  @ApiResponse({
    status: 401,
    description: 'Autentifikatsiya talab qilinadi - Token yuborilmagan yoki noto\'g\'ri',
  })
  @ApiResponse({
    status: 403,
    description: 'Taqiqlangan - Barber faqat o\'zining ma\'lumotlarini o\'chira oladi, ADMIN va SUPER_ADMIN barcha barberlarni o\'chira oladi',
  })
  @ApiResponse({
    status: 404,
    description: 'Barber topilmadi',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.BARBER)
  async remove(@Param('id') id: string, @Request() req: ExpressRequest & { user: TokenPayload }) {
    await this.barberService.removeBarber(+id, req.user);
    return { message: 'Barber muvaffaqiyatli o\'chirildi' };
  }
}

