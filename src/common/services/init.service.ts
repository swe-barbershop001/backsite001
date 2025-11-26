import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/user/entities/user.entity';
import { UserRole } from '../enums/user.enum';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InitService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.createSuperAdmin();
  }

  private async createSuperAdmin() {
    try {
      // SUPER_ADMIN mavjudligini tekshirish
      const existingSuperAdmin = await this.userRepository.findOne({
        where: { role: UserRole.SUPER_ADMIN },
      });

      if (existingSuperAdmin) {
        console.log('[Init] ✅ SUPER_ADMIN allaqachon mavjud');
        return;
      }

      // Environment o'zgaruvchilaridan ma'lumotlarni olish
      const superAdminUsername =
        this.configService.get<string>('SUPER_ADMIN_USERNAME') || 'super_admin';
      const superAdminPassword =
        this.configService.get<string>('SUPER_ADMIN_PASSWORD') || 'super_admin123';
      const superAdminName =
        this.configService.get<string>('SUPER_ADMIN_NAME') || 'Super Admin';
      const superAdminPhone =
        this.configService.get<string>('SUPER_ADMIN_PHONE') || '+998900000000';

      // Parolni hash qilish
      const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

      // SUPER_ADMIN yaratish
      const superAdmin = this.userRepository.create({
        name: superAdminName,
        tg_username: superAdminUsername,
        phone_number: superAdminPhone,
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
      });

      await this.userRepository.save(superAdmin);

      console.log('[Init] ✅ SUPER_ADMIN muvaffaqiyatli yaratildi');
      console.log(`[Init] 📝 Username: ${superAdminUsername}`);
      console.log(`[Init] 🔑 Password: ${superAdminPassword}`);
      console.log(
        '[Init] ⚠️  Xavfsizlik uchun parolni o\'zgartirishni tavsiya qilamiz!',
      );
    } catch (error) {
      console.error('[Init] ❌ SUPER_ADMIN yaratishda xatolik:', error);
    }
  }
}

