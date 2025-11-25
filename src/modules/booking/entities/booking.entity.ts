import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Client } from '../../client/entities/client.entity';
import { Barber } from '../../barber/entities/barber.entity';
import { BarberService } from '../../barber-service/entities/barber-service.entity';
import { BookingStatus } from '../../../common/enums/booking-status.enum';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  client_id: number;

  @Column()
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

  @ManyToOne(() => Client, (client) => client.bookings)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Barber, (barber) => barber.bookings)
  @JoinColumn({ name: 'barber_id' })
  barber: Barber;

  @ManyToOne(() => BarberService)
  @JoinColumn({ name: 'service_id' })
  service: BarberService;

  @CreateDateColumn()
  created_at: Date;
}

