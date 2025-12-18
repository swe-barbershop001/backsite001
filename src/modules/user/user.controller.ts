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
