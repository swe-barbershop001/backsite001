# Barbershop Booking Telegram Bot

A production-ready Telegram bot built with NestJS, TypeORM, and Grammy for managing barbershop bookings.

## Features

- **Client Flow**: Clients can browse barbershops, select barbers, choose dates and time slots, and create bookings
- **Barber Flow**: Barbers receive booking notifications and can approve or reject requests via inline buttons
- **Admin Flow**: Admins can add barbers and list all barbers
- **Real-time Notifications**: Clients receive instant updates when their bookings are approved or rejected

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

### Client Flow

1. Start the bot: `/start`
2. Select a barbershop from the list
3. Select a barber
4. Choose a date (next 7 days)
5. Select an available time slot
6. Wait for barber confirmation

### Admin Commands

- `/add_barber <name> <telegram_id> <barbershop_id>` - Add a new barber
  ```
  Example: /add_barber John Doe 123456789 1
  ```

- `/list_barbers` - List all barbers

### Barber Flow

1. Barbers receive a notification when a client creates a booking
2. Click "✔ Approve" or "❌ Reject" button
3. Client receives instant notification about the decision

## API Endpoints

The application also exposes REST API endpoints:

- `GET /barbershops` - List all barbershops
- `POST /barbershops` - Create a barbershop
- `GET /barbers` - List all barbers
- `POST /barbers` - Create a barber
- `GET /bookings` - List all bookings
- `POST /bookings` - Create a booking
- `PATCH /bookings/:id/approve` - Approve a booking
- `PATCH /bookings/:id/reject` - Reject a booking

## Database Schema

### Barbershop
- `id` (Primary Key)
- `name`
- `address`

### Barber
- `id` (Primary Key)
- `name`
- `tg_id` (Telegram User ID)
- `barbershop_id` (Foreign Key)

### Client
- `id` (Primary Key)
- `tg_id` (Telegram User ID)
- `full_name`
- `username`

### Booking
- `id` (Primary Key)
- `client_id` (Foreign Key)
- `barber_id` (Foreign Key)
- `date`
- `time`
- `status` (pending | approved | rejected)

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
