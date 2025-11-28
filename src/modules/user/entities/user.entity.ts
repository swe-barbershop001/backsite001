import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Booking } from '../../booking/entities/booking.entity';
import { UserRole } from '../../../common/enums/user.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name?:string;

  @Column({ nullable: true })
  phone_number?: string;

  @Column({ unique: true, nullable: true })
  tg_id?: string;

  @Column({ unique: true, nullable: true })
  tg_username?: string;

  @Column({ nullable: true })
  password?: string; // Hash qilingan password (bot orqali ro'yxatdan o'tganda bo'lmaydi)

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CLIENT,
  })
  role: UserRole;

  @Column({ default: false, nullable: true })
  working: boolean; // Barber uchun ishlayapti/ishlamayapti

  @Column({ nullable: true })
  work_start_time?: string; // Barber uchun ish boshlanish vaqti (HH:mm formatida, masalan: "09:00")

  @Column({ nullable: true })
  work_end_time?: string; // Barber uchun ish tugash vaqti (HH:mm formatida, masalan: "18:00")

  @OneToMany(() => Booking, (booking) => booking.client)
  clientBookings: Booking[];

  @OneToMany(() => Booking, (booking) => booking.barber)
  barberBookings: Booking[];

  @CreateDateColumn()
  created_at: Date;
}
