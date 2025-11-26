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
    const allUsers = await userRepository.find();
    if (allUsers.length > 0) {
      await userRepository.remove(allUsers);
    }

    // Hash password for all users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Clients
    console.log('👥 Creating clients...');
    const clients = [
      {
        name: 'Ali Valiyev',
        phone_number: '+998901234567',
        tg_id: '1000000001',
        tg_username: 'ali_valiyev',
        password: hashedPassword,
        role: UserRole.CLIENT,
      },
      {
        name: 'Vali Aliyev',
        phone_number: '+998901234568',
        tg_id: '1000000002',
        tg_username: 'vali_aliyev',
        password: hashedPassword,
        role: UserRole.CLIENT,
      },
      {
        name: 'Hasan Hasanov',
        phone_number: '+998901234569',
        tg_id: '1000000003',
        tg_username: 'hasan_hasanov',
        password: hashedPassword,
        role: UserRole.CLIENT,
      },
      {
        name: 'Husan Husanov',
        phone_number: '+998901234570',
        tg_id: '1000000004',
        tg_username: 'husan_husanov',
        password: hashedPassword,
        role: UserRole.CLIENT,
      },
      {
        name: 'Akmal Akmalov',
        phone_number: '+998901234571',
        tg_id: '1000000005',
        tg_username: 'akmal_akmalov',
        password: hashedPassword,
        role: UserRole.CLIENT,
      },
    ];

    const savedClients = await userRepository.save(clients);
    console.log(`✅ Created ${savedClients.length} clients`);

    // Create Barbers
    console.log('💈 Creating barbers...');
    const barbers = [
      {
        name: 'Rustam Rustamov',
        phone_number: '+998902345678',
        tg_id: '2000000001',
        tg_username: 'rustam_barber',
        password: hashedPassword,
        role: UserRole.BARBER,
        working: true,
      },
      {
        name: 'Javohir Javohirov',
        phone_number: '+998902345679',
        tg_id: '2000000002',
        tg_username: 'javohir_barber',
        password: hashedPassword,
        role: UserRole.BARBER,
        working: true,
      },
      {
        name: 'Sardor Sardorov',
        phone_number: '+998902345680',
        tg_id: '2000000003',
        tg_username: 'sardor_barber',
        password: hashedPassword,
        role: UserRole.BARBER,
        working: false,
      },
      {
        name: 'Dilshod Dilshodov',
        phone_number: '+998902345681',
        tg_id: '2000000004',
        tg_username: 'dilshod_barber',
        password: hashedPassword,
        role: UserRole.BARBER,
        working: true,
      },
      {
        name: 'Farhod Farhodov',
        phone_number: '+998902345682',
        tg_id: '2000000005',
        tg_username: 'farhod_barber',
        password: hashedPassword,
        role: UserRole.BARBER,
        working: true,
      },
    ];

    const savedBarbers = await userRepository.save(barbers);
    console.log(`✅ Created ${savedBarbers.length} barbers`);

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

    // Create Bookings
    console.log('📅 Creating bookings...');
    const today = new Date();
    const bookings: Array<{
      client_id: number;
      barber_id: number;
      service_id: number;
      date: string;
      time: string;
      status: BookingStatus;
      comment?: string;
    }> = [
      // PENDING bookings - comment bo'lmaydi (yangi yaratilgan)
      {
        client_id: savedClients[0].id,
        barber_id: savedBarbers[0].id,
        service_id: savedServices[0].id,
        date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        time: '10:00',
        status: BookingStatus.PENDING,
      },
      // APPROVED bookings - ba'zilarida comment bor (yakunlangandan keyin yozilgan)
      {
        client_id: savedClients[1].id,
        barber_id: savedBarbers[0].id,
        service_id: savedServices[1].id,
        date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        time: '11:00',
        status: BookingStatus.APPROVED,
        comment:
          "Ajoyib xizmat! Barber juda professional va ehtiyotkor edi. Soqolni toza qilib qo'ydi.",
      },
      {
        client_id: savedClients[2].id,
        barber_id: savedBarbers[1].id,
        service_id: savedServices[2].id,
        date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        time: '14:00',
        status: BookingStatus.PENDING,
      },
      // APPROVED booking - comment bor
      {
        client_id: savedClients[0].id,
        barber_id: savedBarbers[1].id,
        service_id: savedServices[3].id,
        date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        time: '15:00',
        status: BookingStatus.APPROVED,
        comment:
          "Yuz parvarishi juda yaxshi bo'ldi. Maxsus krem ishlatilgani sezildi.",
      },
      // REJECTED booking - comment bo'lmaydi
      {
        client_id: savedClients[3].id,
        barber_id: savedBarbers[2].id,
        service_id: savedServices[4].id,
        date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        time: '09:00',
        status: BookingStatus.REJECTED,
      },
      {
        client_id: savedClients[4].id,
        barber_id: savedBarbers[3].id,
        service_id: savedServices[5].id,
        date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        time: '16:00',
        status: BookingStatus.PENDING,
      },
      // APPROVED booking - comment bor
      {
        client_id: savedClients[1].id,
        barber_id: savedBarbers[3].id,
        service_id: savedServices[6].id,
        date: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        time: '10:30',
        status: BookingStatus.APPROVED,
        comment: "Sochni yaxshi yuvdi, lekin biroz tezroq bo'lishi mumkin edi.",
      },
      {
        client_id: savedClients[2].id,
        barber_id: savedBarbers[4].id,
        service_id: savedServices[7].id,
        date: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        time: '13:00',
        status: BookingStatus.PENDING,
      },
      // APPROVED booking - comment yo'q (hali yozilmagan, client'dan so'ralishi kerak)
      {
        client_id: savedClients[3].id,
        barber_id: savedBarbers[4].id,
        service_id: savedServices[8].id,
        date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        time: '11:00',
        status: BookingStatus.APPROVED,
        // Bu booking yakunlangan, lekin client hali comment yozmagan
      },
      {
        client_id: savedClients[4].id,
        barber_id: savedBarbers[0].id,
        service_id: savedServices[9].id,
        date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        time: '14:30',
        status: BookingStatus.PENDING,
      },
    ];

    const savedBookings = await bookingRepository.save(bookings);
    console.log(`✅ Created ${savedBookings.length} bookings`);

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${savedClients.length} clients`);
    console.log(`   - ${savedBarbers.length} barbers`);
    console.log(`   - ${savedServices.length} services`);
    console.log(`   - ${savedBookings.length} bookings`);
    console.log('\n🔑 Default password for all users: password123');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

seed();
