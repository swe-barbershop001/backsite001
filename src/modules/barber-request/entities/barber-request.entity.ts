import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Barbershop } from '../../barbershop/entities/barbershop.entity';

export enum BarberRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('barber_requests')
export class BarberRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  tgId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fullName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  username: string;

  @Column({ name: 'barbershop_id' })
  barbershopId: number;

  @ManyToOne(() => Barbershop)
  @JoinColumn({ name: 'barbershop_id' })
  barbershop: Barbershop;

  @Column({
    type: 'enum',
    enum: BarberRequestStatus,
    default: BarberRequestStatus.PENDING,
  })
  status: BarberRequestStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

