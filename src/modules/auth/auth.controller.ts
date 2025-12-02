import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, TokenPayload } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard, RoleGuard } from 'src/common/guards';
import { Role } from 'src/common/decorators';
import { UserRole } from 'src/common/enums/user.enum';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Yangi admin yoki super_admin ro\'yxatdan o\'tkazish (Faqat admin uchun)' })
  @ApiResponse({ status: 201, description: 'Admin muvaffaqiyatli ro\'yxatdan o\'tkazildi' })
  @ApiResponse({ status: 400, description: 'Noto\'g\'ri so\'rov - API orqali faqat admin va super_admin ro\'yxatdan o\'tishi mumkin' })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.SUPER_ADMIN)
  async register(@Body() registerDto: RegisterDto, @Req() req: Request & {user: TokenPayload}) {
    const currentUser = req.user
    return this.authService.register(registerDto, currentUser);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin yoki super_admin kirish (Faqat admin uchun)' })
  @ApiResponse({ status: 200, description: 'Admin muvaffaqiyatli kirdi' })
  @ApiResponse({ status: 400, description: 'Noto\'g\'ri so\'rov - API orqali faqat admin yoki super_admin kirishi mumkin' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
