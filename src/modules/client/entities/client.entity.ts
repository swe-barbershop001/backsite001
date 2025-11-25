import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Booking } from '../../booking/entities/booking.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  full_name: string;

  @Column({ unique: true })
  phone_number: string;

  @Column({ unique: true })
  tg_id: string;

  @Column({ nullable: true })
  tg_username: string;

  @OneToMany(() => Booking, (booking) => booking.client)
  bookings: Booking[];

  @CreateDateColumn()
  created_at: Date;
}

