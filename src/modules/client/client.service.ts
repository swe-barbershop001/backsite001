import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UserRole } from '../../common/enums/user.enum';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { UpdateUserDto } from '../user/dto/update-user.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class ClientService {
  constructor(private readonly userService: UserService) {}

  /**
   * Yangi client yaratish
   * @param createClientDto Client ma'lumotlari
   * @param currentUser Joriy foydalanuvchi (ADMIN yoki SUPER_ADMIN bo'lishi kerak)
   */
  async createClient(
    createClientDto: CreateClientDto,
    currentUser: { id: number; role: UserRole },
  ) {
    try {
      // Telefon raqam validatsiyasi
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(createClientDto.phone_number)) {
        throw new BadRequestException(
          'Noto\'g\'ri telefon raqam formati. Iltimos, to\'g\'ri formatda kiriting (masalan: +998901234567)',
        );
      }

      // Telefon raqam bilan mavjud foydalanuvchini tekshirish
      const existingUserByPhone = await this.userService.findByPhoneNumber(
        createClientDto.phone_number,
      );
      if (existingUserByPhone) {
        throw new ConflictException(
          `Bu telefon raqam (${createClientDto.phone_number}) bilan foydalanuvchi allaqachon mavjud`,
        );
      }

      // tg_id bilan mavjud foydalanuvchini tekshirish (agar bo'lsa)
      if (createClientDto.tg_id) {
        const existingUserByTgId = await this.userService.findByTgId(
          createClientDto.tg_id,
        );
        if (existingUserByTgId) {
          throw new ConflictException(
            `Bu telegram ID (${createClientDto.tg_id}) bilan foydalanuvchi allaqachon mavjud`,
          );
        }
      }

      // tg_username bilan mavjud foydalanuvchini tekshirish (agar bo'lsa)
      if (createClientDto.tg_username) {
        const existingUserByUsername = await this.userService.findByTgUsername(
          createClientDto.tg_username,
        );
        if (existingUserByUsername) {
          throw new ConflictException(
            `Bu telegram username (@${createClientDto.tg_username}) bilan foydalanuvchi allaqachon mavjud`,
          );
        }
      }

      // CreateUserDto yaratish
      const createUserDto: CreateUserDto = {
        name: createClientDto.name.trim(),
        phone_number: createClientDto.phone_number.trim(),
        tg_id: createClientDto.tg_id?.trim(),
        tg_username: createClientDto.tg_username?.trim(),
        role: UserRole.CLIENT,
      };

      // User yaratish
      const client = await this.userService.create(createUserDto, currentUser);

      // Password bo'lmasligi kerak, lekin agar bo'lsa qaytarmaslik (xavfsizlik uchun)
      const { password, ...clientWithoutPassword } = client;
      return clientWithoutPassword;
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
        `Client yaratishda xatolik: ${error.message || "Noma'lum xatolik"}`,
      );
    }
  }

  /**
   * Barcha clientlarni olish
   */
  async findAllClients(): Promise<Omit<User, 'password'>[]> {
    return await this.userService.findByRole(UserRole.CLIENT);
  }

  /**
   * Client ID bo'yicha olish
   */
  async findClientById(id: number): Promise<Omit<User, 'password'>> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Noto\'g\'ri ID format');
    }

    const client = await this.userService.findOne(id);
    if (!client) {
      throw new NotFoundException(`ID ${id} bilan client topilmadi`);
    }

    // Client ekanligini tekshirish
    if (client.role !== UserRole.CLIENT) {
      throw new BadRequestException(`ID ${id} bilan foydalanuvchi client emas`);
    }

    // Password'ni olib tashlash
    const { password, ...clientWithoutPassword } = client;
    return clientWithoutPassword as Omit<User, 'password'>;
  }

  /**
   * Client ma'lumotlarini yangilash
   */
  async updateClient(
    id: number,
    updateClientDto: UpdateClientDto,
    currentUser: { id: number; role: UserRole },
  ): Promise<Omit<User, 'password'>> {
    try {
      if (!id || isNaN(id)) {
        throw new BadRequestException('Noto\'g\'ri ID format');
      }

      // Client mavjudligini tekshirish
      const existingClient = await this.userService.findOne(id);
      if (!existingClient) {
        throw new NotFoundException(`ID ${id} bilan client topilmadi`);
      }

      // Client ekanligini tekshirish
      if (existingClient.role !== UserRole.CLIENT) {
        throw new BadRequestException(`ID ${id} bilan foydalanuvchi client emas`);
      }

      // Telefon raqam validatsiyasi (agar yangilansa)
      if (updateClientDto.phone_number) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(updateClientDto.phone_number)) {
          throw new BadRequestException(
            'Noto\'g\'ri telefon raqam formati. Iltimos, to\'g\'ri formatda kiriting (masalan: +998901234567)',
          );
        }

        // Telefon raqam bilan mavjud foydalanuvchini tekshirish
        const existingUserByPhone = await this.userService.findByPhoneNumber(
          updateClientDto.phone_number,
        );
        if (existingUserByPhone && existingUserByPhone.id !== id) {
          throw new ConflictException(
            `Bu telefon raqam (${updateClientDto.phone_number}) bilan foydalanuvchi allaqachon mavjud`,
          );
        }
      }

      // tg_id bilan mavjud foydalanuvchini tekshirish (agar yangilansa)
      if (updateClientDto.tg_id) {
        const existingUserByTgId = await this.userService.findByTgId(
          updateClientDto.tg_id,
        );
        if (existingUserByTgId && existingUserByTgId.id !== id) {
          throw new ConflictException(
            `Bu telegram ID (${updateClientDto.tg_id}) bilan foydalanuvchi allaqachon mavjud`,
          );
        }
      }

      // tg_username bilan mavjud foydalanuvchini tekshirish (agar yangilansa)
      if (updateClientDto.tg_username) {
        const existingUserByUsername = await this.userService.findByTgUsername(
          updateClientDto.tg_username,
        );
        if (existingUserByUsername && existingUserByUsername.id !== id) {
          throw new ConflictException(
            `Bu telegram username (@${updateClientDto.tg_username}) bilan foydalanuvchi allaqachon mavjud`,
          );
        }
      }

      // UpdateUserDto yaratish
      const updateUserDto: UpdateUserDto = {
        name: updateClientDto.name?.trim(),
        phone_number: updateClientDto.phone_number?.trim(),
        tg_id: updateClientDto.tg_id?.trim(),
        tg_username: updateClientDto.tg_username?.trim(),
      };

      // User yangilash
      const updatedClient = await this.userService.update(id, updateUserDto, currentUser);

      // Password'ni qaytarmaslik (xavfsizlik uchun)
      const { password, ...clientWithoutPassword } = updatedClient;
      return clientWithoutPassword as Omit<User, 'password'>;
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
        `Client yangilashda xatolik: ${error.message || "Noma'lum xatolik"}`,
      );
    }
  }

  /**
   * Clientni o'chirish
   */
  async removeClient(
    id: number,
    currentUser: { id: number; role: UserRole },
  ): Promise<void> {
    if (!id || isNaN(id)) {
      throw new BadRequestException('Noto\'g\'ri ID format');
    }

    // Client mavjudligini tekshirish
    const existingClient = await this.userService.findOne(id);
    if (!existingClient) {
      throw new NotFoundException(`ID ${id} bilan client topilmadi`);
    }

    // Client ekanligini tekshirish
    if (existingClient.role !== UserRole.CLIENT) {
      throw new BadRequestException(`ID ${id} bilan foydalanuvchi client emas`);
    }

    // User o'chirish
    await this.userService.remove(id, currentUser);
  }
}

