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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
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
  @ApiResponse({ status: 200, description: 'Barcha sartaroshlar ro\'yxati' })
  getBarbers() {
    return this.userService.findByRole(UserRole.BARBER);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Yangi foydalanuvchi yaratish' })
  @ApiResponse({ status: 201, description: 'Foydalanuvchi muvaffaqiyatli yaratildi' })
  @ApiResponse({ status: 400, description: 'Noto\'g\'ri so\'rov' })
  @ApiResponse({
    status: 403,
    description:
      'Taqiqlangan - Faqat SUPER_ADMIN ADMIN foydalanuvchilarini yarata oladi, faqat ADMIN/SUPER_ADMIN BARBER foydalanuvchilarini yarata oladi',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    return this.userService.create(createUserDto, req.user);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Barcha foydalanuvchilarni olish' })
  @ApiResponse({ status: 200, description: 'Barcha foydalanuvchilar ro\'yxati' })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ID bo\'yicha foydalanuvchini olish' })
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
  @ApiOperation({ summary: 'Foydalanuvchini yangilash' })
  @ApiParam({ name: 'id', type: 'number', description: 'Foydalanuvchi ID' })
  @ApiResponse({ status: 200, description: 'Foydalanuvchi muvaffaqiyatli yangilandi' })
  @ApiResponse({ status: 404, description: 'Foydalanuvchi topilmadi' })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Foydalanuvchini o\'chirish' })
  @ApiParam({ name: 'id', type: 'number', description: 'Foydalanuvchi ID' })
  @ApiResponse({ status: 200, description: 'Foydalanuvchi muvaffaqiyatli o\'chirildi' })
  @ApiResponse({ status: 404, description: 'Foydalanuvchi topilmadi' })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
