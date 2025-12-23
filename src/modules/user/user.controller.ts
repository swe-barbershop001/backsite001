import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AuthGuard, RoleGuard } from 'src/common/guards';
import { UserRole } from 'src/common/enums/user.enum';
import { Role } from 'src/common/decorators';

@Controller('users')
@ApiTags('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

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

  @Patch(':id/role')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Foydalanuvchi rolini yangilash',
    description: `
      Foydalanuvchi rolini yangilash uchun endpoint.
      
      **Ruxsatlar:**
      - Faqat ADMIN va SUPER_ADMIN foydalana oladi
      - SUPER_ADMIN barcha foydalanuvchilarning rollarini o'zgartirishi mumkin
      - ADMIN faqat BARBER va CLIENT rollarini o'zgartirishi mumkin
      
      **Cheklovlar:**
      - O'z rolingizni o'zgartira olmaysiz
      - ADMIN boshqa ADMIN yoki SUPER_ADMIN rollarini o'zgartira olmaydi
      - ADMIN foydalanuvchilarni faqat BARBER yoki CLIENT rollariga o'zgartira oladi
    `
  })
  @ApiParam({ 
    name: 'id', 
    type: 'number', 
    description: 'Roli o\'zgartirilishi kerak bo\'lgan foydalanuvchi ID',
    example: 5
  })
  @ApiResponse({
    status: 200,
    description: 'Foydalanuvchi roli muvaffaqiyatli yangilandi',
    schema: {
      example: {
        id: 5,
        name: 'John Doe',
        phone_number: '+998901234567',
        tg_id: '123456789',
        tg_username: 'johndoe',
        role: 'barber',
        working: true,
        work_start_time: '09:00',
        work_end_time: '18:00',
        profile_image: '/uploads/profiles/user-123.jpg',
        created_at: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Noto\'g\'ri so\'rov - ID format xato yoki noto\'g\'ri role qiymati',
    schema: {
      example: {
        statusCode: 400,
        message: 'Noto\'g\'ri foydalanuvchi ID format',
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Taqiqlangan - Sizda bu amalni bajarish uchun ruxsat yo\'q',
    schema: {
      examples: {
        'own-role': {
          value: {
            statusCode: 403,
            message: 'O\'z rolingizni o\'zgartirib bo\'lmaydi. Boshqa admin yordamidan foydalaning',
            error: 'Forbidden'
          }
        },
        'admin-limitation': {
          value: {
            statusCode: 403,
            message: 'ADMIN faqat BARBER va CLIENT rollarini o\'zgartirishi mumkin',
            error: 'Forbidden'
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Foydalanuvchi topilmadi',
    schema: {
      example: {
        statusCode: 404,
        message: 'ID 5 bilan foydalanuvchi topilmadi',
        error: 'Not Found'
      }
    }
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Request() req: any,
  ) {
    const currentUser = req.user;
    return this.userService.updateRole(+id, updateRoleDto.role, currentUser);
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
