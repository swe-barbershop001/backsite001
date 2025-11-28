import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { LessThan, IsNull, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { UserRole } from '../../common/enums/user.enum';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CleanupService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  // Har 1 soatda bir marta tekshiradi
  @Cron('0 * * * *')
  async removeUnregisteredClients() {
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await this.userRepository.delete({
      tg_id: IsNull(),
      role: UserRole.CLIENT,
      created_at: LessThan(threshold),
    });

    console.log("O'chirilgan clientlar: ", result.affected);
  }
}
