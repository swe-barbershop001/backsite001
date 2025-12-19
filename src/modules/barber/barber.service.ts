import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';
import { UserRole } from '../../common/enums/user.enum';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { UpdateUserDto } from '../user/dto/update-user.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class BarberService {
  constructor(private readonly userService: UserService) {}

  /**
   * Yangi barber yaratish
   * @param createBarberDto Barber ma'lumotlari
   * @param currentUser Joriy foydalanuvchi (ADMIN yoki SUPER_ADMIN bo'lishi kerak)
   */
  async createBarber(
    createBarberDto: CreateBarberDto,
    currentUser: { id: number; role: UserRole },
  ) {
    try {
      // Telefon raqam validatsiyasi (agar bo'lsa)
      if (createBarberDto.phone_number) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(createBarberDto.phone_number)) {
          throw new BadRequestException(
            'Noto\'g\'ri telefon raqam formati. Iltimos, to\'g\'ri formatda kiriting (masalan: +998901234567)',
          );
        }

        // Telefon raqam bilan mavjud foydalanuvchini tekshirish
        const existingUserByPhone = await this.userService.findByPhoneNumber(
          createBarberDto.phone_number,
        );
        if (existingUserByPhone) {
          throw new ConflictException(
            `Bu telefon raqam (${createBarberDto.phone_number}) bilan foydalanuvchi allaqachon mavjud`,
          );
        }
      }

      // tg_id bilan mavjud foydalanuvchini tekshirish (agar bo'lsa)
      if (createBarberDto.tg_id) {
        const existingUserByTgId = await this.userService.findByTgId(
          createBarberDto.tg_id,
        );
        if (existingUserByTgId) {
          throw new ConflictException(
            `Bu telegram ID (${createBarberDto.tg_id}) bilan foydalanuvchi allaqachon mavjud`,
          );
        }
      }

      // tg_username bilan mavjud foydalanuvchini tekshirish (agar bo'lsa)
      if (createBarberDto.tg_username) {
        const existingUserByUsername = await this.userService.findByTgUsername(
          createBarberDto.tg_username,
        );
        if (existingUserByUsername) {
          throw new ConflictException(
            `Bu telegram username (@${createBarberDto.tg_username}) bilan foydalanuvchi allaqachon mavjud`,
          );
        }
      }

      // Work time validatsiyasi
      if (createBarberDto.work_start_time && createBarberDto.work_end_time) {
        const startTime = this.parseTime(createBarberDto.work_start_time);
        const endTime = this.parseTime(createBarberDto.work_end_time);
        
        if (startTime >= endTime) {
          throw new BadRequestException(
            'Ish boshlash vaqti ish tugash vaqtidan kichik bo\'lishi kerak',
          );
        }
      }

      // CreateUserDto yaratish
      const createUserDto: CreateUserDto = {
        name: createBarberDto.name.trim(),
        phone_number: createBarberDto.phone_number?.trim(),
        tg_id: createBarberDto.tg_id?.trim(),
        tg_username: createBarberDto.tg_username?.trim(),
        password: createBarberDto.password,
        working: createBarberDto.working ?? false,
        work_start_time: createBarberDto.work_start_time?.trim(),
        work_end_time: createBarberDto.work_end_time?.trim(),
        profile_image: createBarberDto.profile_image,
        role: UserRole.BARBER,
      };

      // User yaratish
      const barber = await this.userService.create(createUserDto, currentUser);

      // Password'ni qaytarmaslik (xavfsizlik uchun)
      const { password, ...barberWithoutPassword } = barber;
      return barberWithoutPassword;
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
        `Barber yaratishda xatolik: ${error.message || "Noma'lum xatolik"}`,
      );
    }
  }

  /**
   * Barcha barberlarni olish
   */
  async findAllBarbers(): Promise<Omit<User, 'password'>[]> {
    return await this.userService.findByRole(UserRole.BARBER);
  }

  /**
   * Barber ID bo'yicha olish
   */
  async findBarberById(id: number): Promise<Omit<User, 'password'>> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Noto\'g\'ri ID format');
    }

    const barber = await this.userService.findOne(id);
    if (!barber) {
      throw new NotFoundException(`ID ${id} bilan barber topilmadi`);
    }

    // Barber ekanligini tekshirish
    if (barber.role !== UserRole.BARBER) {
      throw new BadRequestException(`ID ${id} bilan foydalanuvchi barber emas`);
    }

    // Password'ni olib tashlash
    const { password, ...barberWithoutPassword } = barber;
    return barberWithoutPassword as Omit<User, 'password'>;
  }

  /**
   * Barber ma'lumotlarini yangilash
   */
  async updateBarber(
    id: number,
    updateBarberDto: UpdateBarberDto,
    currentUser: { id: number; role: UserRole },
  ): Promise<Omit<User, 'password'>> {
    try {
      if (!id || isNaN(id)) {
        throw new BadRequestException('Noto\'g\'ri ID format');
      }

      // Barber mavjudligini tekshirish
      const existingBarber = await this.userService.findOne(id);
      if (!existingBarber) {
        throw new NotFoundException(`ID ${id} bilan barber topilmadi`);
      }

      // Barber ekanligini tekshirish
      if (existingBarber.role !== UserRole.BARBER) {
        throw new BadRequestException(`ID ${id} bilan foydalanuvchi barber emas`);
      }

      // Agar role BARBER bo'lsa, faqat o'zining ma'lumotlarini yangilashi mumkin
      if (currentUser.role === UserRole.BARBER) {
        if (currentUser.id !== id) {
          throw new ForbiddenException(
            'Barber faqat o\'zining ma\'lumotlarini yangilashi mumkin',
          );
        }
      }

      // Telefon raqam validatsiyasi (agar yangilansa)
      if (updateBarberDto.phone_number) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(updateBarberDto.phone_number)) {
          throw new BadRequestException(
            'Noto\'g\'ri telefon raqam formati. Iltimos, to\'g\'ri formatda kiriting (masalan: +998901234567)',
          );
        }

        // Telefon raqam bilan mavjud foydalanuvchini tekshirish
        const existingUserByPhone = await this.userService.findByPhoneNumber(
          updateBarberDto.phone_number,
        );
        if (existingUserByPhone && existingUserByPhone.id !== id) {
          throw new ConflictException(
            `Bu telefon raqam (${updateBarberDto.phone_number}) bilan foydalanuvchi allaqachon mavjud`,
          );
        }
      }

      // tg_id bilan mavjud foydalanuvchini tekshirish (agar yangilansa)
      if (updateBarberDto.tg_id) {
        const existingUserByTgId = await this.userService.findByTgId(
          updateBarberDto.tg_id,
        );
        if (existingUserByTgId && existingUserByTgId.id !== id) {
          throw new ConflictException(
            `Bu telegram ID (${updateBarberDto.tg_id}) bilan foydalanuvchi allaqachon mavjud`,
          );
        }
      }

      // tg_username bilan mavjud foydalanuvchini tekshirish (agar yangilansa)
      if (updateBarberDto.tg_username) {
        const existingUserByUsername = await this.userService.findByTgUsername(
          updateBarberDto.tg_username,
        );
        if (existingUserByUsername && existingUserByUsername.id !== id) {
          throw new ConflictException(
            `Bu telegram username (@${updateBarberDto.tg_username}) bilan foydalanuvchi allaqachon mavjud`,
          );
        }
      }

      // Work time validatsiyasi
      const workStartTime = updateBarberDto.work_start_time || existingBarber.work_start_time;
      const workEndTime = updateBarberDto.work_end_time || existingBarber.work_end_time;
      
      if (workStartTime && workEndTime) {
        const startTime = this.parseTime(workStartTime);
        const endTime = this.parseTime(workEndTime);
        
        if (startTime >= endTime) {
          throw new BadRequestException(
            'Ish boshlash vaqti ish tugash vaqtidan kichik bo\'lishi kerak',
          );
        }
      }

      // UpdateUserDto yaratish
      const updateUserDto: UpdateUserDto = {
        name: updateBarberDto.name?.trim(),
        phone_number: updateBarberDto.phone_number?.trim(),
        tg_id: updateBarberDto.tg_id?.trim(),
        tg_username: updateBarberDto.tg_username?.trim(),
        password: updateBarberDto.password,
        working: updateBarberDto.working,
        work_start_time: updateBarberDto.work_start_time?.trim(),
        work_end_time: updateBarberDto.work_end_time?.trim(),
        profile_image: updateBarberDto.profile_image,
      };

      // User yangilash
      const updatedBarber = await this.userService.update(id, updateUserDto, currentUser);

      // Password'ni qaytarmaslik (xavfsizlik uchun)
      const { password, ...barberWithoutPassword } = updatedBarber;
      return barberWithoutPassword as Omit<User, 'password'>;
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
        `Barber yangilashda xatolik: ${error.message || "Noma'lum xatolik"}`,
      );
    }
  }

  /**
   * Barberni o'chirish
   */
  async removeBarber(
    id: number,
    currentUser: { id: number; role: UserRole },
  ): Promise<void> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Noto\'g\'ri ID format');
    }

    // Barber mavjudligini tekshirish
    const existingBarber = await this.userService.findOne(id);
    if (!existingBarber) {
      throw new NotFoundException(`ID ${id} bilan barber topilmadi`);
    }

    // Barber ekanligini tekshirish
    if (existingBarber.role !== UserRole.BARBER) {
      throw new BadRequestException(`ID ${id} bilan foydalanuvchi barber emas`);
    }

    // Agar role BARBER bo'lsa, faqat o'zining ma'lumotlarini o'chirishi mumkin
    if (currentUser.role === UserRole.BARBER) {
      if (currentUser.id !== id) {
        throw new ForbiddenException(
          'Barber faqat o\'zining ma\'lumotlarini o\'chirishi mumkin',
        );
      }
    }

    // User o'chirish
    await this.userService.remove(id, currentUser);
  }

  /**
   * Vaqtni minutlarga o'girish (validatsiya uchun)
   */
  private parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

