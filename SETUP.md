# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:
- `BOT_TOKEN`: Get from [@BotFather](https://t.me/botfather)
- `ADMIN_TG_ID`: Get from [@userinfobot](https://t.me/userinfobot)
- Database credentials

## Step 3: Setup Database

```bash
# Create PostgreSQL database
createdb barbershop_bot

# Or using psql
psql -U postgres
CREATE DATABASE barbershop_bot;
```

## Step 4: Run the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## Step 5: Test the Bot

1. Open Telegram and search for your bot
2. Send `/start` command
3. Follow the booking flow

## Adding Initial Data

### Add a Barbershop (via API or directly in DB)

```bash
curl -X POST http://localhost:3000/barbershops \
  -H "Content-Type: application/json" \
  -d '{"name": "Downtown Barbershop", "address": "123 Main St"}'
```

### Add a Barber (via Bot Command)

```
/add_barber John Doe 123456789 1
```

Where:
- `John Doe` = Barber name
- `123456789` = Barber's Telegram user ID
- `1` = Barbershop ID

## Troubleshooting

### Bot not responding?
- Check that `BOT_TOKEN` is correct in `.env`
- Verify bot is running: check logs for "Telegram bot started successfully"

### Database connection errors?
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database `barbershop_bot` exists

### Module not found errors?
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then `npm install`

