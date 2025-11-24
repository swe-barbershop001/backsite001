# Barbershop Booking Telegram Bot

A production-ready Telegram bot built with NestJS, TypeORM, and Grammy for managing barbershop bookings.

## Features

### 👤 Client (Mijoz) funksiyalari

- ✅ Telegram orqali ro'yxatdan o'tish
- ✅ Barbershop va barber tanlash
- ✅ Sana va vaqt tanlash (keyingi 7 kun)
- ✅ Booking yaratish
- ✅ Booking holatini kuzatish
- ✅ Reply keyboard orqali oson booking qilish

### ✂️ Barber (Barber) funksiyalari

- ✅ Barber sifatida ro'yxatdan o'tish (admin tasdiqlashi bilan)
- ✅ Booking so'rovlarini qabul qilish
- ✅ Bookinglarni tasdiqlash yoki rad etish
- ✅ Real-time booking bildirishnomalari

### 🔧 Admin funksiyalari

- ✅ Admin panel orqali boshqaruv
- ✅ Barber so'rovlarini ko'rish va tasdiqlash
- ✅ Umumiy statistika ko'rish
- ✅ Barberlar ro'yxatini ko'rish

### 🔔 Umumiy funksiyalar

- ✅ Real-time bildirishnomalar
- ✅ Inline keyboard orqali qulay interfeys
- ✅ Reply keyboard orqali tez kirish
- ✅ Booking holatini kuzatish
- ✅ REST API orqali boshqaruv

## Tech Stack

- **NestJS** - Progressive Node.js framework
- **TypeORM** - Object-Relational Mapping
- **Grammy** - Telegram Bot Framework
- **PostgreSQL** - Database
- **TypeScript** - Type-safe JavaScript

## Project Structure

```
src/
├── config/              # Configuration files
├── common/              # Shared constants and utilities
├── modules/
│   ├── bot/            # Telegram bot logic and handlers
│   ├── booking/        # Booking management
│   ├── barber/         # Barber management
│   ├── barbershop/     # Barbershop management
│   ├── client/         # Client management
│   └── common/         # Common module
└── main.ts             # Application entry point
```

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd barbershop-bot
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```env
   # Telegram Bot Configuration
   BOT_TOKEN=your_telegram_bot_token_here

   # Admin Telegram User ID
   ADMIN_TG_ID=your_admin_telegram_user_id_here

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_DATABASE=barbershop_bot

   # Application Port
   PORT=3000
   ```

4. **Set up PostgreSQL database**

   ```bash
   # Create database
   createdb barbershop_bot
   ```

5. **Run the application**

   ```bash
   # Development mode
   npm run start:dev

   # Production mode
   npm run build
   npm run start:prod
   ```

## Getting Your Telegram Bot Token

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the bot token and add it to your `.env` file

## Getting Your Admin Telegram User ID

1. Open Telegram and search for [@userinfobot](https://t.me/userinfobot)
2. Start a conversation with the bot
3. Copy your user ID and add it to your `.env` file as `ADMIN_TG_ID`

## Usage

### Bot Commands

#### 🔹 Umumiy komandalar (Barcha foydalanuvchilar uchun)

**`/start`** - Botni boshlash va ro'yxatdan o'tish

- Yangi foydalanuvchilar: Client yoki Barber sifatida ro'yxatdan o'tish
- Allaqachon ro'yxatdan o'tganlar: Mavjud holat haqida xabar

**`/me`** - Shaxsiy ma'lumotlarni ko'rish

- Telegram ID
- Rol (Client/Barber)
- Barbershop (Barber uchun)
- Holat va ro'yxatdan o'tgan sana

**`📅 Booking qilish`** - Booking qilish tugmasi (faqat Client uchun)

- Reply keyboard orqali mavjud
- Barbershop tanlash
- Barber tanlash
- Sana va vaqt tanlash

#### 🔹 Admin komandalar (Faqat admin uchun)

**`/admin`** - Admin panel

- Umumiy statistika (Barberlar, Mijozlar, Kutilayotgan so'rovlar)
- Kutilayotgan barber so'rovlari ro'yxati
- Mavjud buyruqlar haqida ma'lumot

**`/list_barbers`** - Barcha barberlar ro'yxati

- Barber ismi
- Telegram ID
- Barbershop nomi

### 📱 Foydalanish jarayoni

#### Client Flow (Mijoz)

1. **Ro'yxatdan o'tish**: `/start` → "👤 Client" tugmasini bosing
2. **Booking qilish**:
   - Reply keyboard dan "📅 Booking qilish" tugmasini bosing
   - Barbershop tanlang
   - Barber tanlang
   - Sana tanlang (keyingi 7 kun)
   - Vaqt tanlang (mavjud vaqtlar)
3. **Tasdiqlashni kutish**: Barber tasdiqlashini kutib turing
4. **Xabar olish**: Booking tasdiqlangan yoki rad etilgan haqida xabar olasiz

#### Barber Flow (Barber)

1. **Ro'yxatdan o'tish**: `/start` → "✂️ Barber" tugmasini bosing
2. **Barbershop tanlash**: Qaysi barbershopda ishlayotganingizni tanlang
3. **Tasdiqlashni kutish**: Admin tasdiqlashini kutib turing
4. **Booking qabul qilish**:
   - Yangi booking so'rovi kelganda xabar olasiz
   - "✔ Approve" yoki "❌ Reject" tugmasini bosing
   - Mijozga avtomatik xabar yuboriladi

#### Admin Flow

1. **Admin panel**: `/admin` - Umumiy statistika va kutilayotgan so'rovlar
2. **Barber so'rovlarini ko'rish**: Admin panelda kutilayotgan so'rovlar ro'yxati
3. **Barber so'rovini tasdiqlash**:
   - "✔ Approve" tugmasini bosing → Barber yaratiladi
   - "✖ Reject" tugmasini bosing → So'rov rad etiladi
4. **Barberlar ro'yxati**: `/list_barbers` - Barcha barberlar ro'yxati

## API Endpoints

Loyiha REST API endpointlarini ham taqdim etadi:

### Barbershop Endpoints

- `GET /barbershops` - Barcha barbershoplar ro'yxati
- `POST /barbershops` - Yangi barbershop yaratish
- `GET /barbershops/:id` - ID bo'yicha barbershop olish
- `PATCH /barbershops/:id` - Barbershopni yangilash
- `DELETE /barbershops/:id` - Barbershopni o'chirish

### Barber Endpoints

- `GET /barbers` - Barcha barberlar ro'yxati
- `POST /barbers` - Yangi barber yaratish
- `GET /barbers/:id` - ID bo'yicha barber olish
- `PATCH /barbers/:id` - Barberni yangilash
- `DELETE /barbers/:id` - Barberni o'chirish

### Client Endpoints

- `GET /clients` - Barcha mijozlar ro'yxati
- `POST /clients` - Yangi mijoz yaratish
- `GET /clients/:id` - ID bo'yicha mijoz olish
- `PATCH /clients/:id` - Mijozni yangilash
- `DELETE /clients/:id` - Mijozni o'chirish

### Booking Endpoints

- `GET /bookings` - Barcha bookinglar ro'yxati
- `POST /bookings` - Yangi booking yaratish
- `GET /bookings/:id` - ID bo'yicha booking olish
- `PATCH /bookings/:id/approve` - Bookingni tasdiqlash
- `PATCH /bookings/:id/reject` - Bookingni rad etish

### Barber Request Endpoints

- `GET /barber-requests` - Barcha barber so'rovlari ro'yxati
- `POST /barber-requests` - Yangi barber so'rovi yaratish
- `GET /barber-requests/pending` - Kutilayotgan so'rovlar ro'yxati
- `GET /barber-requests/:id` - ID bo'yicha so'rov olish
- `PATCH /barber-requests/:id/approve` - So'rovni tasdiqlash
- `PATCH /barber-requests/:id/reject` - So'rovni rad etish
- `DELETE /barber-requests/:id` - So'rovni o'chirish

> 💡 **Eslatma**: Barcha API endpointlar Swagger dokumentatsiyasida mavjud: `http://localhost:3000/api`

## Database Schema

### Barbershop (barbershops)

- `id` (Primary Key, Auto Increment)
- `name` (VARCHAR)
- `address` (VARCHAR, nullable)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Barber (barbers)

- `id` (Primary Key, Auto Increment)
- `name` (VARCHAR)
- `tg_id` (BIGINT, Unique) - Telegram User ID
- `barbershop_id` (Foreign Key → barbershops.id)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Client (clients)

- `id` (Primary Key, Auto Increment)
- `tg_id` (BIGINT, Unique) - Telegram User ID
- `full_name` (VARCHAR, nullable)
- `username` (VARCHAR, nullable)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Barber Request (barber_requests)

- `id` (Primary Key, Auto Increment)
- `tg_id` (BIGINT) - Telegram User ID
- `full_name` (VARCHAR, nullable)
- `username` (VARCHAR, nullable)
- `barbershop_id` (Foreign Key → barbershops.id)
- `status` (ENUM: pending | approved | rejected)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Booking (bookings)

- `id` (Primary Key, Auto Increment)
- `client_id` (Foreign Key → clients.id)
- `barber_id` (Foreign Key → barbers.id)
- `date` (DATE)
- `time` (VARCHAR)
- `status` (ENUM: pending | approved | rejected)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

## Development

```bash
# Run in development mode with hot reload
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Run tests
npm run test

# Run linting
npm run lint
```

## Environment Variables

All sensitive data must be stored in `.env` file:

- `BOT_TOKEN` - Telegram bot token (required)
- `ADMIN_TG_ID` - Admin Telegram user ID (required)
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_USERNAME` - Database username (default: postgres)
- `DB_PASSWORD` - Database password (default: postgres)
- `DB_DATABASE` - Database name (default: barbershop_bot)
- `PORT` - Application port (default: 3000)

## Security Notes

- Never commit `.env` file to version control
- Use strong passwords for database in production
- Keep your bot token secure
- Enable database SSL in production environments

## License

MIT
