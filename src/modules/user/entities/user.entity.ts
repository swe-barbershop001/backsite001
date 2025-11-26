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

  @Column({ unique: true, nullable: true })
  phone_number?: string;

  @Column({ unique: true, nullable: true })
  tg_id?: string;

  @Column({ unique: true, nullable: false })
  tg_username: string;

  @Column({ nullable:false })
  password:string; // Hash qilingan password

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CLIENT,
  })
  role: UserRole;

  @Column({ default: false, nullable: true })
  working: boolean; // Barber uchun ishlayapti/ishlamayapti

  @OneToMany(() => Booking, (booking) => booking.client)
  clientBookings: Booking[];

  @OneToMany(() => Booking, (booking) => booking.barber)
  barberBookings: Booking[];

  @CreateDateColumn()
  created_at: Date;
}
