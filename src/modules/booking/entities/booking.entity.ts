import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { BarberService } from '../../barber-service/entities/barber-service.entity';
import { BookingStatus } from '../../../common/enums/booking-status.enum';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  client_id: number;

  @Column({ nullable: true })
  barber_id: number;

  @Column()
  service_id: number;

  @Column()
  date: string; // yyyy-mm-dd

  @Column()
  time: string; // HH:mm

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({ nullable: true, type: 'text' })
  comment?: string; // Client tomonidan yozilgan izoh

  @Column({ default: false })
  notification_sent: boolean; // 30 daqiqa oldin ogohlantirish yuborilganligi

  @Column({ type: 'timestamp', nullable: true })
  end_time: Date; // Booking tugash vaqti (date + time + service duration)

  @Column({ default: false })
  completion_notification_sent: boolean; // Booking tugash vaqtida xabar yuborilganligi

  @ManyToOne(() => User, (user) => user.clientBookings, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'client_id' })
  client: User;

  @ManyToOne(() => User, (user) => user.barberBookings, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'barber_id' })
  barber: User;

  @ManyToOne(() => BarberService)
  @JoinColumn({ name: 'service_id' })
  service: BarberService;

  @CreateDateColumn()
  created_at: Date;
}
