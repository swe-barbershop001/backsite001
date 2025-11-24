import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Barber } from '../../barber/entities/barber.entity';

@Entity('barbershops')
export class Barbershop {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @OneToMany(() => Barber, (barber) => barber.barbershop)
  barbers: Barber[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

