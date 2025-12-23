import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin yoki super_admin kirish (Faqat admin uchun)' })
  @ApiResponse({ status: 200, description: 'Admin muvaffaqiyatli kirdi' })
  @ApiResponse({ status: 400, description: 'Noto\'g\'ri so\'rov - API orqali faqat admin yoki super_admin kirishi mumkin' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
