import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ServiceCategory } from '../../service-category/entities/service-category.entity';

@Entity('barber_services')
export class BarberService {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column()
  duration: number; // daqiqa

  @Column({ nullable: true })
  image_url: string; // xizmat rasmi

  @Column()
  category_id: number;

  @ManyToOne(() => ServiceCategory, (category) => category.services, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category: ServiceCategory;

  @CreateDateColumn()
  created_at: Date;
}
