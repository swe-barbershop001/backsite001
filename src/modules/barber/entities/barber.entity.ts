import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Barbershop } from '../../barbershop/entities/barbershop.entity';
import { Booking } from '../../booking/entities/booking.entity';

@Entity('barbers')
export class Barber {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'bigint', unique: true })
  tgId: number;

  @Column({ name: 'barbershop_id' })
  barbershopId: number;

  @ManyToOne(() => Barbershop, (barbershop) => barbershop.barbers)
  @JoinColumn({ name: 'barbershop_id' })
  barbershop: Barbershop;

  @OneToMany(() => Booking, (booking) => booking.barber)
  bookings: Booking[];

  @Column({ default: false })
  working: boolean; // true = barber shift started, false = shift ended

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

