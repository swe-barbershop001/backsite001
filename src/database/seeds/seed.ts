import { DataSource } from 'typeorm';
import { User } from '../../modules/user/entities/user.entity';
import { BarberService } from '../../modules/barber-service/entities/barber-service.entity';
import { Booking } from '../../modules/booking/entities/booking.entity';
import { UserRole } from '../../common/enums/user.enum';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import * as bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'barbershop',
    entities: [User, BarberService, Booking],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const userRepository = dataSource.getRepository(User);
    const serviceRepository = dataSource.getRepository(BarberService);
    const bookingRepository = dataSource.getRepository(Booking);

    // Clear existing data (tartib muhim - foreign key constraint'lar tufayli)
    console.log('🗑️  Clearing existing data...');
    // Avval bookings (foreign key'larga ega bo'lgan jadval)
    const allBookings = await bookingRepository.find();
    if (allBookings.length > 0) {
      await bookingRepository.remove(allBookings);
    }
    // Keyin services va users
    const allServices = await serviceRepository.find();
    if (allServices.length > 0) {
      await serviceRepository.remove(allServices);
    }

    // Create Barber Services
    console.log('✂️  Creating barber services...');
    const services = [
      {
        name: 'Soch olish',
        price: 50000,
        duration: 30,
      },
      {
        name: 'Soqol olish',
        price: 30000,
        duration: 20,
      },
      {
        name: 'Soch va soqol',
        price: 70000,
        duration: 45,
      },
      {
        name: 'Yuz parvarishi',
        price: 40000,
        duration: 25,
      },
      {
        name: 'Qosh tuzlash',
        price: 20000,
        duration: 15,
      },
      {
        name: "Soch bo'yash",
        price: 80000,
        duration: 60,
      },
      {
        name: 'Sochni yuvish',
        price: 15000,
        duration: 10,
      },
      {
        name: 'Massaj',
        price: 35000,
        duration: 30,
      },
      {
        name: 'Stilistika',
        price: 100000,
        duration: 90,
      },
      {
        name: "To'liq kompleks",
        price: 120000,
        duration: 120,
      },
    ];

    const savedServices = await serviceRepository.save(services);
    console.log(`✅ Created ${savedServices.length} services`);

    console.log('\n🎉 Seed completed successfully!');
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

seed();
