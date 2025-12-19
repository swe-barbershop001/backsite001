import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UserRole } from '../../common/enums/user.enum';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { UpdateUserDto } from '../user/dto/update-user.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AdminService {
  constructor(private readonly userService: UserService) {}

  /**
   * Yangi admin yaratish
   * @param createAdminDto Admin ma'lumotlari
   * @param currentUser Joriy foydalanuvchi (SUPER_ADMIN bo'lishi kerak)
   */
  async createAdmin(
    createAdminDto: CreateAdminDto,
    currentUser: { id: number; role: UserRole },
  ) {
    try {
      // Telefon raqam validatsiyasi
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(createAdminDto.phone_number)) {
        throw new BadRequestException(
          'Noto\'g\'ri telefon raqam formati. Iltimos, to\'g\'ri formatda kiriting (masalan: +998901234567)',
        );
      }

      // Telefon raqam bilan mavjud foydalanuvchini tekshirish
      const existingUserByPhone = await this.userService.findByPhoneNumber(
        createAdminDto.phone_number,
      );
      if (existingUserByPhone) {
        throw new ConflictException(
          `Bu telefon raqam (${createAdminDto.phone_number}) bilan foydalanuvchi allaqachon mavjud`,
        );
      }

      // tg_username bilan mavjud foydalanuvchini tekshirish (agar bo'lsa)
      if (createAdminDto.tg_username) {
        const existingUserByUsername = await this.userService.findByTgUsername(
          createAdminDto.tg_username,
        );
        if (existingUserByUsername) {
          throw new ConflictException(
            `Bu telegram username (@${createAdminDto.tg_username}) bilan foydalanuvchi allaqachon mavjud`,
          );
        }
      }

      // CreateUserDto yaratish
      const createUserDto: CreateUserDto = {
        name: createAdminDto.name.trim(),
        phone_number: createAdminDto.phone_number.trim(),
        tg_username: createAdminDto.tg_username?.trim(),
        password: createAdminDto.password,
        profile_image: createAdminDto.profile_image,
        role: UserRole.ADMIN,
      };

      // User yaratish
      const admin = await this.userService.create(createUserDto, currentUser);

      // Password'ni qaytarmaslik (xavfsizlik uchun)
      const { password, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
    } catch (error) {
      // Agar allaqachon NestJS exception bo'lsa, to'g'ridan-to'g'ri throw qilish
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      // Boshqa xatoliklar uchun
      throw new BadRequestException(
        `Admin yaratishda xatolik: ${error.message || "Noma'lum xatolik"}`,
      );
    }
  }

  /**
   * Barcha adminlarni olish
   */
  async findAllAdmins(): Promise<Omit<User, 'password'>[]> {
    return await this.userService.findByRole(UserRole.ADMIN);
  }

  /**
   * Admin ID bo'yicha olish
   */
  async findAdminById(id: number): Promise<Omit<User, 'password'>> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Noto\'g\'ri ID format');
    }

    const admin = await this.userService.findOne(id);
    if (!admin) {
      throw new NotFoundException(`ID ${id} bilan admin topilmadi`);
    }

    // Admin ekanligini tekshirish
    if (admin.role !== UserRole.ADMIN) {
      throw new BadRequestException(`ID ${id} bilan foydalanuvchi admin emas`);
    }

    // Password'ni olib tashlash
    const { password, ...adminWithoutPassword } = admin;
    return adminWithoutPassword as Omit<User, 'password'>;
  }

  /**
   * Admin ma'lumotlarini yangilash
   */
  async updateAdmin(
    id: number,
    updateAdminDto: UpdateAdminDto,
    currentUser: { id: number; role: UserRole },
  ): Promise<Omit<User, 'password'>> {
    try {
      if (!id || isNaN(id)) {
        throw new BadRequestException('Noto\'g\'ri ID format');
      }

      // Admin mavjudligini tekshirish
      const existingAdmin = await this.userService.findOne(id);
      if (!existingAdmin) {
        throw new NotFoundException(`ID ${id} bilan admin topilmadi`);
      }

      // Admin ekanligini tekshirish
      if (existingAdmin.role !== UserRole.ADMIN) {
        throw new BadRequestException(`ID ${id} bilan foydalanuvchi admin emas`);
      }

      // Agar role ADMIN bo'lsa, faqat o'zining ma'lumotlarini yangilashi mumkin
      if (currentUser.role === UserRole.ADMIN) {
        if (currentUser.id !== id) {
          throw new ForbiddenException(
            'Admin faqat o\'zining ma\'lumotlarini yangilashi mumkin',
          );
        }
      }

      // Telefon raqam validatsiyasi (agar yangilansa)
      if (updateAdminDto.phone_number) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(updateAdminDto.phone_number)) {
          throw new BadRequestException(
            'Noto\'g\'ri telefon raqam formati. Iltimos, to\'g\'ri formatda kiriting (masalan: +998901234567)',
          );
        }

        // Telefon raqam bilan mavjud foydalanuvchini tekshirish
        const existingUserByPhone = await this.userService.findByPhoneNumber(
          updateAdminDto.phone_number,
        );
        if (existingUserByPhone && existingUserByPhone.id !== id) {
          throw new ConflictException(
            `Bu telefon raqam (${updateAdminDto.phone_number}) bilan foydalanuvchi allaqachon mavjud`,
          );
        }
      }

      // tg_username bilan mavjud foydalanuvchini tekshirish (agar yangilansa)
      if (updateAdminDto.tg_username) {
        const existingUserByUsername = await this.userService.findByTgUsername(
          updateAdminDto.tg_username,
        );
        if (existingUserByUsername && existingUserByUsername.id !== id) {
          throw new ConflictException(
            `Bu telegram username (@${updateAdminDto.tg_username}) bilan foydalanuvchi allaqachon mavjud`,
          );
        }
      }

      // UpdateUserDto yaratish
      const updateUserDto: UpdateUserDto = {
        name: updateAdminDto.name?.trim(),
        phone_number: updateAdminDto.phone_number?.trim(),
        tg_username: updateAdminDto.tg_username?.trim(),
        password: updateAdminDto.password,
        profile_image: updateAdminDto.profile_image,
      };

      // User yangilash
      const updatedAdmin = await this.userService.update(id, updateUserDto, currentUser);

      // Password'ni qaytarmaslik (xavfsizlik uchun)
      const { password, ...adminWithoutPassword } = updatedAdmin;
      return adminWithoutPassword as Omit<User, 'password'>;
    } catch (error) {
      // Agar allaqachon NestJS exception bo'lsa, to'g'ridan-to'g'ri throw qilish
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      // Boshqa xatoliklar uchun
      throw new BadRequestException(
        `Admin yangilashda xatolik: ${error.message || "Noma'lum xatolik"}`,
      );
    }
  }

  /**
   * Adminni o'chirish
   */
  async removeAdmin(
    id: number,
    currentUser: { id: number; role: UserRole },
  ): Promise<void> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Noto\'g\'ri ID format');
    }

    // Admin mavjudligini tekshirish
    const existingAdmin = await this.userService.findOne(id);
    if (!existingAdmin) {
      throw new NotFoundException(`ID ${id} bilan admin topilmadi`);
    }

    // Admin ekanligini tekshirish
    if (existingAdmin.role !== UserRole.ADMIN) {
      throw new BadRequestException(`ID ${id} bilan foydalanuvchi admin emas`);
    }

    // Agar role ADMIN bo'lsa, faqat o'zining ma'lumotlarini o'chirishi mumkin
    if (currentUser.role === UserRole.ADMIN) {
      if (currentUser.id !== id) {
        throw new ForbiddenException(
          'Admin faqat o\'zining ma\'lumotlarini o\'chirishi mumkin',
        );
      }
    }

    // User o'chirish
    await this.userService.remove(id, currentUser);
  }
}

