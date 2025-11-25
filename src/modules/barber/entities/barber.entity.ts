import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Booking } from '../../booking/entities/booking.entity';

@Entity('barbers')
export class Barber {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  tg_id: string;

  @Column({ nullable: true })
  tg_username: string;

  @Column({ default: false })
  working: boolean;

  @OneToMany(() => Booking, (booking) => booking.barber)
  bookings: Booking[];

  @CreateDateColumn()
  created_at: Date;
}

