import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from 'src/common/enums/user.enum';
import { jwtConfig } from 'src/config';
import type { JwtConfigType } from 'src/config';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface TokenPayload {
  id: number;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(jwtConfig.KEY) private readonly jwtConfig: JwtConfigType,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { name, tg_username, phone_number, password } = registerDto;
    const existingUser = await this.userService.findByTgUsername(tg_username);
    if (existingUser) {
      throw new BadRequestException(
        `Bu tg_username (${tg_username}) bilan foydalanuvchi allaqachon mavjud`,
      );
    }
    const hashedPassword = await this.hashPassword(password);
    const user = await this.userService.create({
      name,
      tg_username,
      phone_number,
      password: hashedPassword,
    });
    const token = await this.generateToken({ id: user.id, role: user.role });
    return { token, user };
  }

  async login(loginDto: LoginDto) {
    const { tg_username, password } = loginDto;
    const user = await this.userService.findByTgUsername(tg_username);
    if (!user) {
      throw new BadRequestException(
        `Bu tg_username (${tg_username}) bilan foydalanuvchi topilmadi`,
      );
    }
    if (!user.password) {
      throw new BadRequestException("Foydalanuvchida parol o'rnatilmagan");
    }
    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException("Noto'g'ri parol");
    }
    const token = await this.generateToken({ id: user.id, role: user.role });
    return { token, user };
  }

  private generateToken(payload: TokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  verifyToken(token: string): Promise<TokenPayload> {
    return this.jwtService.verifyAsync(token);
  }

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
