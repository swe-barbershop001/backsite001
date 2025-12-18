import {
  Injectable,
  Inject,
  forwardRef,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from '../../common/enums/user.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {}

  /**
   * Normalize tg_username by removing leading '@' symbol if present
   */
  private normalizeTgUsername(tg_username?: string): string | undefined {
    if (!tg_username) return undefined;
    return tg_username.startsWith('@') ? tg_username.slice(1) : tg_username;
  }

  async create(createUserDto: CreateUserDto, currentUser?: { id: number; role: UserRole }): Promise<User> {
    // ADMIN role yaratishni faqat SUPER_ADMIN qila oladi
    if (createUserDto.role === UserRole.ADMIN) {
      if (!currentUser || currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          'ADMIN role\'ga ega foydalanuvchini faqat SUPER_ADMIN yarata oladi',
        );
      }
    }

    // BARBER role yaratishni faqat ADMIN yoki SUPER_ADMIN qila oladi
    if (createUserDto.role === UserRole.BARBER) {
      if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SUPER_ADMIN)) {
        throw new ForbiddenException(
          'BARBER role\'ga ega foydalanuvchini faqat ADMIN yoki SUPER_ADMIN yarata oladi',
        );
      }
    }

    // Normalize tg_username (remove leading '@' if present)
    if (createUserDto.tg_username) {
      createUserDto.tg_username = this.normalizeTgUsername(createUserDto.tg_username);
    }

    // Unique tekshiruvlar
    // if (createUserDto.phone_number && createUserDto.name) {
    //   const existingUserByPhone = await this.userRepository.findOne({
    //     where: { phone_number: createUserDto.phone_number, name: createUserDto.name },
    //   });
    //   if (existingUserByPhone) {
    //     throw new BadRequestException(
    //       `Bu telefon raqam (${createUserDto.phone_number}) va (${createUserDto}) bilan foydalanuvchi allaqachon mavjud`,
    //     );
    //   }
    // }

    if (createUserDto.tg_id) {
      const existingUserByTgId = await this.userRepository.findOne({
        where: { tg_id: createUserDto.tg_id },
      });
      if (existingUserByTgId) {
        throw new BadRequestException(
          `Bu tg_id (${createUserDto.tg_id}) bilan foydalanuvchi allaqachon mavjud`,
        );
      }
    }

    if (createUserDto.tg_username) {
      const existingUserByTgUsername = await this.userRepository.findOne({
        where: { tg_username: createUserDto.tg_username },
      });
      if (existingUserByTgUsername) {
        throw new BadRequestException(
          `Bu tg_username (${createUserDto.tg_username}) bilan foydalanuvchi allaqachon mavjud`,
        );
      }
    }

    // Password'ni hash qilish (agar allaqachon hash qilinmagan bo'lsa)
    // Bot orqali ro'yxatdan o'tganda password bo'lmaydi
    if (createUserDto.password) {
      // Bcrypt hash'lar $2b$, $2a$ yoki $2y$ bilan boshlanadi va 60 belgidan iborat
      const isAlreadyHashed = /^\$2[aby]\$\d{2}\$/.test(createUserDto.password);
      if (!isAlreadyHashed) {
        createUserDto.password = await this.authService.hashPassword(
          createUserDto.password,
        );
      }
    }

    // Bot orqali ro'yxatdan o'tganda password bo'lmasa, vaqtinchalik password yaratish
    // Lekin bu faqat tg_id bo'lsa va password bo'lmasa
    if (!createUserDto.password && createUserDto.tg_id) {
      // Bot orqali ro'yxatdan o'tgan foydalanuvchilar uchun password kerak emas
    }

    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    currentUser?: { id: number; role: UserRole },
  ): Promise<User> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Noto\'g\'ri ID format');
    }
    
    // Foydalanuvchi mavjudligini tekshirish
    const existingUser = await this.findOne(id);
    if (!existingUser) {
      throw new NotFoundException(`ID ${id} bilan foydalanuvchi topilmadi`);
    }
    
    // Agar role BARBER bo'lsa, faqat o'zining ma'lumotlarini yangilashi mumkin
    if (currentUser && currentUser.role === UserRole.BARBER) {
      if (currentUser.id !== id) {
        throw new ForbiddenException(
          'Barber faqat o\'zining ma\'lumotlarini yangilashi mumkin',
        );
      }
    }

    // Unique tekshiruvlar (faqat yangilangan maydonlar uchun)
    if (updateUserDto.phone_number) {
      const existingUserByPhone = await this.userRepository.findOne({
        where: { phone_number: updateUserDto.phone_number },
      });
      if (existingUserByPhone && existingUserByPhone.id !== id) {
        throw new BadRequestException(
          `Bu telefon raqam (${updateUserDto.phone_number}) bilan foydalanuvchi allaqachon mavjud`,
        );
      }
    }

    if (updateUserDto.tg_id) {
      const existingUserByTgId = await this.userRepository.findOne({
        where: { tg_id: updateUserDto.tg_id },
      });
      if (existingUserByTgId && existingUserByTgId.id !== id) {
        throw new BadRequestException(
          `Bu tg_id (${updateUserDto.tg_id}) bilan foydalanuvchi allaqachon mavjud`,
        );
      }
    }

    // Normalize tg_username (remove leading '@' if present)
    if (updateUserDto.tg_username) {
      updateUserDto.tg_username = this.normalizeTgUsername(updateUserDto.tg_username);
    }

    if (updateUserDto.tg_username) {
      const existingUserByTgUsername = await this.userRepository.findOne({
        where: { tg_username: updateUserDto.tg_username },
      });
      if (existingUserByTgUsername && existingUserByTgUsername.id !== id) {
        throw new BadRequestException(
          `Bu tg_username (${updateUserDto.tg_username}) bilan foydalanuvchi allaqachon mavjud`,
        );
      }
    }

    // Password yangilansa hash qilish (agar allaqachon hash qilinmagan bo'lsa)
    if (updateUserDto.password) {
      // Bcrypt hash'lar $2b$, $2a$ yoki $2y$ bilan boshlanadi va 60 belgidan iborat
      const isAlreadyHashed = /^\$2[aby]\$\d{2}\$/.test(updateUserDto.password);
      if (!isAlreadyHashed) {
        updateUserDto.password = await this.authService.hashPassword(
          updateUserDto.password,
        );
      }
    }

    await this.userRepository.update(id, updateUserDto);
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`ID ${id} bilan foydalanuvchi topilmadi`);
    }
    return user;
  }

  async remove(id: number, currentUser?: { id: number; role: UserRole }): Promise<void> {
    // Agar role BARBER bo'lsa, faqat o'zining ma'lumotlarini o'chirishi mumkin
    if (currentUser && currentUser.role === UserRole.BARBER) {
      if (currentUser.id !== id) {
        throw new ForbiddenException(
          'Barber faqat o\'zining ma\'lumotlarini o\'chirishi mumkin',
        );
      }
    }

    await this.userRepository.delete(id);
  }

  async findByTgId(tgId: string): Promise<User | null> {
    if (!tgId) return null;
    return await this.userRepository.findOne({
      where: { tg_id: tgId },
      relations: [
        'clientBookings',
        'barberBookings',
        'clientBookings.service',
        'barberBookings.service',
      ],
    });
  }

  async findByTgUsername(tgUsername: string): Promise<User | null> {
    if (!tgUsername) return null;
    return await this.userRepository.findOne({
      where: { tg_username: tgUsername },
    });
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    if (!phoneNumber) return null;
    return await this.userRepository.findOne({
      where: { phone_number: phoneNumber },
    });
  }

  async findOne(id: number): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
      relations: ['clientBookings', 'barberBookings'],
    });
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      relations: ['clientBookings', 'barberBookings'],
    });
  }

  async findByRole(role: UserRole): Promise<Omit<User, 'password'>[]> {
    const users = await this.userRepository.find({
      where: { role },
      relations: ['clientBookings', 'barberBookings'],
    });
    // Password'ni olib tashlash
    return users.map(({ password, ...user }) => user as Omit<User, 'password'>);
  }

  async findWorkingBarbers(): Promise<User[]> {
    return await this.userRepository.find({
      where: { role: UserRole.BARBER, working: true },
    });
  }

  async updateWorkingStatus(id: number, working: boolean): Promise<User> {
    await this.userRepository.update(id, { working });
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`ID ${id} bilan foydalanuvchi topilmadi`);
    }
    return user;
  }

  async updateTgId(id: number, tgId: string): Promise<User> {
    // Unique tekshiruv
    const existingUserByTgId = await this.userRepository.findOne({
      where: { tg_id: tgId },
    });
    if (existingUserByTgId && existingUserByTgId.id !== id) {
      throw new BadRequestException(
        `Bu tg_id (${tgId}) bilan foydalanuvchi allaqachon mavjud`,
      );
    }

    await this.userRepository.update(id, { tg_id: tgId });
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`ID ${id} bilan foydalanuvchi topilmadi`);
    }
    return user;
  }

  // Helper methods for backward compatibility
  async findClientByTgId(tgId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { tg_id: tgId, role: UserRole.CLIENT },
      relations: [
        'clientBookings',
        'clientBookings.service',
        'clientBookings.barber',
      ],
    });
  }

  async findBarberByTgId(tgId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { tg_id: tgId, role: UserRole.BARBER },
      relations: [
        'barberBookings',
        'barberBookings.service',
        'barberBookings.client',
      ],
    });
  }

  async findBarberByTgUsername(tgUsername: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { tg_username: tgUsername, role: UserRole.BARBER },
    });
  }
}
