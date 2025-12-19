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
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AuthGuard, RoleGuard } from '../../common/guards';
import { UserRole } from '../../common/enums/user.enum';
import { Role } from '../../common/decorators';
import { TokenPayload } from '../../modules/auth/auth.service';

@Controller('admin')
@ApiTags('Admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Yangi admin yaratish',
    description:
      'Faqat SUPER_ADMIN yangi admin yarata oladi. Admin yaratish uchun ism, telefon raqami va parol talab qilinadi. Profile rasm fayli ixtiyoriy.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'phone_number', 'password'],
      properties: {
        name: {
          type: 'string',
          description: 'Admin ismi (kamida 2 belgi)',
          example: 'John Doe',
          minLength: 2,
        },
        phone_number: {
          type: 'string',
          description: 'Telefon raqami (E.164 formatida)',
          example: '+998901234567',
          pattern: '^\\+?[1-9]\\d{1,14}$',
        },
        tg_username: {
          type: 'string',
          description: 'Telegram foydalanuvchi nomi (@ belgisiz, ixtiyoriy)',
          example: 'johndoe',
        },
        password: {
          type: 'string',
          description: 'Parol (kamida 4 belgi)',
          example: 'password123',
          minLength: 4,
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
    description: 'Admin muvaffaqiyatli yaratildi',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1, description: 'Admin ID' },
        name: { type: 'string', example: 'John Doe', description: 'Admin ismi' },
        phone_number: { type: 'string', example: '+998901234567', description: 'Telefon raqami' },
        tg_username: { type: 'string', nullable: true, example: 'johndoe', description: 'Telegram username' },
        role: { type: 'string', enum: ['admin'], example: 'admin', description: 'Foydalanuvchi roli' },
        profile_image: { type: 'string', nullable: true, example: '/uploads/profiles/admin-123.jpg', description: 'Profile rasm yo\'li' },
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
    description: 'Taqiqlangan - Faqat SUPER_ADMIN yangi admin yarata oladi',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Faqat SUPER_ADMIN yangi admin yarata oladi' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Telefon raqam yoki telegram username allaqachon mavjud',
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
  @Role(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('profile_image', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `admin-${uniqueSuffix}${ext}`);
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
    @Body() createAdminDto: CreateAdminDto,
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
    // File yuborilgan bo'lsa, file path'ni DTO'ga qo'shish
    if (file) {
      createAdminDto.profile_image = `/uploads/profiles/${file.filename}`;
    }

    // Bo'sh string'larni undefined qilish
    if (createAdminDto.tg_username === '') {
      createAdminDto.tg_username = undefined;
    }
    if (createAdminDto.profile_image === '') {
      createAdminDto.profile_image = undefined;
    }

    return this.adminService.createAdmin(createAdminDto, req.user);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Barcha adminlar ro\'yxatini olish',
    description: 'Faqat SUPER_ADMIN yoki ADMIN barcha adminlar ro\'yxatini ko\'ra oladi.',
  })
  @ApiResponse({
    status: 200,
    description: 'Barcha adminlar ro\'yxati',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1, description: 'Admin ID' },
          name: { type: 'string', example: 'John Doe', description: 'Admin ismi' },
          phone_number: { type: 'string', nullable: true, example: '+998901234567', description: 'Telefon raqami' },
          tg_username: { type: 'string', nullable: true, example: 'johndoe', description: 'Telegram username' },
          role: { type: 'string', enum: ['admin'], example: 'admin', description: 'Foydalanuvchi roli' },
          profile_image: { type: 'string', nullable: true, example: '/uploads/profiles/admin-123.jpg', description: 'Profile rasm yo\'li' },
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
    description: 'Taqiqlangan - Faqat SUPER_ADMIN yoki ADMIN barcha adminlar ro\'yxatini ko\'ra oladi',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findAll() {
    return this.adminService.findAllAdmins();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin ID bo\'yicha olish',
    description: 'Faqat SUPER_ADMIN yoki ADMIN admin ma\'lumotlarini ko\'ra oladi.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Admin ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Admin topildi',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1, description: 'Admin ID' },
        name: { type: 'string', example: 'John Doe', description: 'Admin ismi' },
        phone_number: { type: 'string', nullable: true, example: '+998901234567', description: 'Telefon raqami' },
        tg_username: { type: 'string', nullable: true, example: 'johndoe', description: 'Telegram username' },
        role: { type: 'string', enum: ['admin'], example: 'admin', description: 'Foydalanuvchi roli' },
        profile_image: { type: 'string', nullable: true, example: '/uploads/profiles/admin-123.jpg', description: 'Profile rasm yo\'li' },
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
    description: 'Taqiqlangan - Faqat SUPER_ADMIN yoki ADMIN admin ma\'lumotlarini ko\'ra oladi',
  })
  @ApiResponse({
    status: 404,
    description: 'Admin topilmadi',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'ID 1 bilan admin topilmadi' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.adminService.findAdminById(+id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin ma\'lumotlarini yangilash',
    description:
      'SUPER_ADMIN barcha adminlarni yangilay oladi, ADMIN faqat o\'zining ma\'lumotlarini yangilay oladi. Profile rasm fayli ixtiyoriy.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', type: 'number', description: 'Admin ID', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Admin ismi (kamida 2 belgi, ixtiyoriy)',
          example: 'John Doe',
          minLength: 2,
        },
        phone_number: {
          type: 'string',
          description: 'Telefon raqami (E.164 formatida, ixtiyoriy)',
          example: '+998901234567',
          pattern: '^\\+?[1-9]\\d{1,14}$',
        },
        tg_username: {
          type: 'string',
          description: 'Telegram foydalanuvchi nomi (@ belgisiz, ixtiyoriy)',
          example: 'johndoe',
        },
        password: {
          type: 'string',
          description: 'Parol (kamida 4 belgi, ixtiyoriy)',
          example: 'password123',
          minLength: 4,
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
    description: 'Admin muvaffaqiyatli yangilandi',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1, description: 'Admin ID' },
        name: { type: 'string', example: 'John Doe', description: 'Admin ismi' },
        phone_number: { type: 'string', nullable: true, example: '+998901234567', description: 'Telefon raqami' },
        tg_username: { type: 'string', nullable: true, example: 'johndoe', description: 'Telegram username' },
        role: { type: 'string', enum: ['admin'], example: 'admin', description: 'Foydalanuvchi roli' },
        profile_image: { type: 'string', nullable: true, example: '/uploads/profiles/admin-123.jpg', description: 'Profile rasm yo\'li' },
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
    description: 'Taqiqlangan - SUPER_ADMIN barcha adminlarni yangilay oladi, ADMIN faqat o\'zining ma\'lumotlarini yangilay oladi',
  })
  @ApiResponse({
    status: 404,
    description: 'Admin topilmadi',
  })
  @ApiResponse({
    status: 409,
    description: 'Telefon raqam yoki telegram username allaqachon mavjud',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('profile_image', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `admin-${uniqueSuffix}${ext}`);
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
    @Body() updateAdminDto: UpdateAdminDto,
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
      const existingAdmin = await this.adminService.findAdminById(+id);
      if (existingAdmin.profile_image) {
        // Eski faylni o'chirish
        const filePath = join(process.cwd(), existingAdmin.profile_image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      updateAdminDto.profile_image = `/uploads/profiles/${file.filename}`;
    }

    // Bo'sh string'larni undefined qilish
    if (updateAdminDto.profile_image === '') {
      updateAdminDto.profile_image = undefined;
    }
    if (updateAdminDto.tg_username === '') {
      updateAdminDto.tg_username = undefined;
    }
    if (updateAdminDto.phone_number === '') {
      updateAdminDto.phone_number = undefined;
    }
    if (updateAdminDto.password === '') {
      updateAdminDto.password = undefined;
    }
    if (updateAdminDto.name === '') {
      updateAdminDto.name = undefined;
    }

    return this.adminService.updateAdmin(+id, updateAdminDto, req.user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Adminni o\'chirish',
    description: 'SUPER_ADMIN barcha adminlarni o\'chira oladi, ADMIN faqat o\'zining ma\'lumotlarini o\'chira oladi.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Admin ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Admin muvaffaqiyatli o\'chirildi',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Admin muvaffaqiyatli o\'chirildi' },
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
    description: 'Taqiqlangan - SUPER_ADMIN barcha adminlarni o\'chira oladi, ADMIN faqat o\'zining ma\'lumotlarini o\'chira oladi',
  })
  @ApiResponse({
    status: 404,
    description: 'Admin topilmadi',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async remove(@Param('id') id: string, @Request() req: ExpressRequest & { user: TokenPayload }) {
    await this.adminService.removeAdmin(+id, req.user);
    return { message: 'Admin muvaffaqiyatli o\'chirildi' };
  }
}

