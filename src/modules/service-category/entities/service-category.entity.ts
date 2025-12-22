import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { BarberService } from '../../barber-service/entities/barber-service.entity';

@Entity('service_categories')
export class ServiceCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  icon: string; // emoji yoki icon identifier

  @OneToMany(() => BarberService, (service) => service.category)
  services: BarberService[];

  @CreateDateColumn()
  created_at: Date;
}

