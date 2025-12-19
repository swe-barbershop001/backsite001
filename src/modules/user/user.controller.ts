import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
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
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateBarberDto } from './dto/create-barber.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard, RoleGuard } from 'src/common/guards';
import { UserRole } from 'src/common/enums/user.enum';
import { Role } from 'src/common/decorators';

@Controller('users')
@ApiTags('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('barbers')
  @ApiOperation({ summary: 'Barcha sartaroshlarni olish (Ochiq)' })
  @ApiResponse({ status: 200, description: "Barcha sartaroshlar ro'yxati" })
  getBarbers() {
    return this.userService.findByRole(UserRole.BARBER);
  }

  @Post('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Yangi admin yaratish',
    description: 'Faqat SUPER_ADMIN yangi admin yarata oladi. Admin yaratish uchun ism, telefon raqami va parol talab qilinadi.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'phone_number', 'password'],
      properties: {
        name: {
          type: 'string',
          description: 'Admin ismi',
          example: 'John Doe',
        },
        phone_number: {
          type: 'string',
          description: 'Telefon raqami',
          example: '+998901234567',
        },
        tg_username: {
          type: 'string',
          description: 'Telegram foydalanuvchi nomi (ixtiyoriy)',
          example: 'johndoe',
        },
        password: {
          type: 'string',
          description: 'Parol (kamida 4 belgi)',
          example: 'password123',
        },
        profile_image: {
          type: 'string',
          format: 'binary',
          description: 'Profile rasm fayli (image/jpeg, image/png, image/jpg) - ixtiyoriy',
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
        id: { type: 'number', example: 1 },
        name: { type: 'string', example: 'John Doe' },
        phone_number: { type: 'string', example: '+998901234567' },
        role: { type: 'string', example: 'admin' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Noto'g'ri so'rov - talab qilinadigan maydonlar to'ldirilmagan yoki noto'g'ri format",
  })
  @ApiResponse({
    status: 401,
    description: 'Autentifikatsiya talab qilinadi',
  })
  @ApiResponse({
    status: 403,
    description: 'Taqiqlangan - Faqat SUPER_ADMIN yangi admin yarata oladi',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.SUPER_ADMIN)
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
          cb(new Error('Faqat rasm fayllari qabul qilinadi'), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async createAdmin(
    @Body() createAdminDto: CreateAdminDto,
    @Request() req: any,
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
      createAdminDto.profile_image = `/uploads/profiles/${file.filename}`;
    }

    const createUserDto: CreateUserDto = {
      ...createAdminDto,
      role: UserRole.ADMIN,
    };

    return this.userService.create(createUserDto, req.user);
  }

  @Post('barber')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Yangi barber (sartarosh) yaratish',
    description: 'Faqat ADMIN yoki SUPER_ADMIN yangi barber yarata oladi. Barber yaratish uchun ism talab qilinadi, qolgan maydonlar ixtiyoriy.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          description: 'Barber ismi',
          example: 'Ahmad Karimov',
        },
        phone_number: {
          type: 'string',
          description: 'Telefon raqami (ixtiyoriy)',
          example: '+998901234567',
        },
        tg_id: {
          type: 'string',
          description: 'Telegram ID (ixtiyoriy)',
          example: '123456789',
        },
        tg_username: {
          type: 'string',
          description: 'Telegram foydalanuvchi nomi (ixtiyoriy)',
          example: 'ahmad_barber',
        },
        password: {
          type: 'string',
          description: 'Parol (ixtiyoriy)',
          example: 'password123',
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
          description: 'Profile rasm fayli (image/jpeg, image/png, image/jpg) - ixtiyoriy',
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
        id: { type: 'number', example: 1 },
        name: { type: 'string', example: 'Ahmad Karimov' },
        phone_number: { type: 'string', example: '+998901234567' },
        role: { type: 'string', example: 'barber' },
        working: { type: 'boolean', example: false },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Noto'g'ri so'rov - talab qilinadigan maydonlar to'ldirilmagan yoki noto'g'ri format",
  })
  @ApiResponse({
    status: 401,
    description: 'Autentifikatsiya talab qilinadi',
  })
  @ApiResponse({
    status: 403,
    description: 'Taqiqlangan - Faqat ADMIN yoki SUPER_ADMIN yangi barber yarata oladi',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
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
          cb(new Error('Faqat rasm fayllari qabul qilinadi'), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async createBarber(
    @Body() createBarberDto: CreateBarberDto,
    @Request() req: any,
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

    const createUserDto: CreateUserDto = {
      ...createBarberDto,
      role: UserRole.BARBER,
    };

    return this.userService.create(createUserDto, req.user);
  }

  @Post('client')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Yangi client (mijoz) yaratish',
    description: 'Faqat ADMIN yoki SUPER_ADMIN yangi client yarata oladi. Client yaratish uchun ism va telefon raqami talab qilinadi.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'phone_number'],
      properties: {
        name: {
          type: 'string',
          description: 'Client ismi',
          example: 'Ali Valiyev',
        },
        phone_number: {
          type: 'string',
          description: 'Telefon raqami',
          example: '+998901234567',
        },
        tg_id: {
          type: 'string',
          description: 'Telegram ID (ixtiyoriy)',
          example: '123456789',
        },
        tg_username: {
          type: 'string',
          description: 'Telegram foydalanuvchi nomi (ixtiyoriy)',
          example: 'ali_client',
        },
        profile_image: {
          type: 'string',
          format: 'binary',
          description: 'Profile rasm fayli (image/jpeg, image/png, image/jpg) - ixtiyoriy',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Client muvaffaqiyatli yaratildi',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        name: { type: 'string', example: 'Ali Valiyev' },
        phone_number: { type: 'string', example: '+998901234567' },
        role: { type: 'string', example: 'client' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Noto'g'ri so'rov - talab qilinadigan maydonlar to'ldirilmagan yoki noto'g'ri format",
  })
  @ApiResponse({
    status: 401,
    description: 'Autentifikatsiya talab qilinadi',
  })
  @ApiResponse({
    status: 403,
    description: 'Taqiqlangan - Faqat ADMIN yoki SUPER_ADMIN yangi client yarata oladi',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('profile_image', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `client-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Faqat rasm fayllari qabul qilinadi'), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async createClient(
    @Body() createClientDto: CreateClientDto,
    @Request() req: any,
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
      createClientDto.profile_image = `/uploads/profiles/${file.filename}`;
    }

    if (createClientDto.profile_image === '') {
      createClientDto.profile_image = undefined;
    }

    const createUserDto: CreateUserDto = {
      ...createClientDto,
      role: UserRole.CLIENT,
    };

    return this.userService.create(createUserDto, req.user);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Yangi foydalanuvchi yaratish (profile rasm bilan)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Foydalanuvchi ismi' },
        phone_number: { type: 'string', description: 'Telefon raqami' },
        tg_id: { type: 'string', description: 'Telegram ID' },
        tg_username: { type: 'string', description: 'Telegram foydalanuvchi nomi' },
        password: { type: 'string', description: 'Parol' },
        role: { type: 'string', enum: Object.values(UserRole), description: 'Foydalanuvchi roli' },
        working: { type: 'boolean', description: 'Sartarosh ishlayaptimi?' },
        work_start_time: { type: 'string', description: 'Ish boshlash vaqti (HH:mm)' },
        work_end_time: { type: 'string', description: 'Ish tugash vaqti (HH:mm)' },
        profile_image: {
          type: 'string',
          format: 'binary',
          description: 'Profile rasm fayli (image/jpeg, image/png, image/jpg)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Foydalanuvchi muvaffaqiyatli yaratildi',
  })
  @ApiResponse({ status: 400, description: "Noto'g'ri so'rov" })
  @ApiResponse({
    status: 403,
    description:
      'Taqiqlangan - Faqat SUPER_ADMIN ADMIN foydalanuvchilarini yarata oladi, faqat ADMIN/SUPER_ADMIN BARBER foydalanuvchilarini yarata oladi',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('profile_image', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `user-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Faqat MIME type bo'yicha tekshirish - image bo'lsa qabul qilish
        if (file.mimetype && file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Faqat rasm fayllari qabul qilinadi'), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async create(
    @Body() createUserDto: CreateUserDto,
    @Request() req: any,
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
    // Agar file yuborilgan bo'lsa, file path'ni DTO'ga qo'shish
    if (file) {
      createUserDto.profile_image = `/uploads/profiles/${file.filename}`;
    }

    // Bo'sh string'larni undefined qilish (optional field'lar uchun)
    if (createUserDto.work_start_time === '') {
      createUserDto.work_start_time = undefined;
    }
    if (createUserDto.work_end_time === '') {
      createUserDto.work_end_time = undefined;
    }
    if (createUserDto.profile_image === '') {
      createUserDto.profile_image = undefined;
    }

    return this.userService.create(createUserDto, req.user);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Barcha foydalanuvchilarni olish' })
  @ApiResponse({ status: 200, description: "Barcha foydalanuvchilar ro'yxati" })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: "ID bo'yicha foydalanuvchini olish" })
  @ApiParam({ name: 'id', type: 'number', description: 'Foydalanuvchi ID' })
  @ApiResponse({ status: 200, description: 'Foydalanuvchi topildi' })
  @ApiResponse({ status: 404, description: 'Foydalanuvchi topilmadi' })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Foydalanuvchini yangilash (profile rasm bilan)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Foydalanuvchi ismi' },
        phone_number: { type: 'string', description: 'Telefon raqami' },
        tg_id: { type: 'string', description: 'Telegram ID' },
        tg_username: { type: 'string', description: 'Telegram foydalanuvchi nomi' },
        password: { type: 'string', description: 'Parol' },
        role: { type: 'string', enum: Object.values(UserRole), description: 'Foydalanuvchi roli' },
        working: { type: 'boolean', description: 'Sartarosh ishlayaptimi?' },
        work_start_time: { type: 'string', description: 'Ish boshlash vaqti (HH:mm)' },
        work_end_time: { type: 'string', description: 'Ish tugash vaqti (HH:mm)' },
        profile_image: {
          type: 'string',
          format: 'binary',
          description: 'Profile rasm fayli (image/jpeg, image/png, image/jpg)',
        },
      },
    },
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Foydalanuvchi ID' })
  @ApiResponse({
    status: 200,
    description: 'Foydalanuvchi muvaffaqiyatli yangilandi',
  })
  @ApiResponse({ status: 404, description: 'Foydalanuvchi topilmadi' })
  @ApiResponse({
    status: 403,
    description:
      "Taqiqlangan - Barber faqat o'z ma'lumotlarini yangilashi mumkin",
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
          cb(null, `user-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Faqat MIME type bo'yicha tekshirish - image bo'lsa qabul qilish
        if (file.mimetype && file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Faqat rasm fayllari qabul qilinadi'), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
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
      const existingUser = await this.userService.findOne(+id);
      if (existingUser?.profile_image) {
        // Eski faylni o'chirish
        const filePath = join(process.cwd(), existingUser.profile_image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      updateUserDto.profile_image = `/uploads/profiles/${file.filename}`;
    }

    // Bo'sh string'larni undefined qilish (optional field'lar uchun)
    if (updateUserDto.work_start_time === '') {
      updateUserDto.work_start_time = undefined;
    }
    if (updateUserDto.work_end_time === '') {
      updateUserDto.work_end_time = undefined;
    }
    if (updateUserDto.profile_image === '') {
      updateUserDto.profile_image = undefined;
    }

    return this.userService.update(+id, updateUserDto, req.user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Foydalanuvchini o'chirish" })
  @ApiParam({ name: 'id', type: 'number', description: 'Foydalanuvchi ID' })
  @ApiResponse({
    status: 200,
    description: "Foydalanuvchi muvaffaqiyatli o'chirildi",
  })
  @ApiResponse({ status: 404, description: 'Foydalanuvchi topilmadi' })
  @ApiResponse({
    status: 403,
    description:
      "Taqiqlangan - Barber faqat o'z ma'lumotlarini o'chirishi mumkin",
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.BARBER)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.userService.remove(+id, req.user);
  }
}
