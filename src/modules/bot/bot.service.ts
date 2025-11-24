import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, Context, InlineKeyboard } from 'grammy';
import { BarbershopService } from '../barbershop/barbershop.service';
import { BarberService } from '../barber/barber.service';
import { ClientService } from '../client/client.service';
import { BookingService } from '../booking/booking.service';
import { BookingStatus } from '../../common/constants';

interface BookingSession {
  barbershopId?: number;
  barberId?: number;
  date?: string;
  time?: string;
}

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private bot: Bot;
  private userSessions: Map<number, BookingSession> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly barbershopService: BarbershopService,
    private readonly barberService: BarberService,
    private readonly clientService: ClientService,
    private readonly bookingService: BookingService,
  ) {
    const token = this.configService.get<string>('BOT_TOKEN');
    if (!token) {
      throw new Error('BOT_TOKEN is not set in environment variables');
    }
    this.bot = new Bot(token);
  }

  async onModuleInit() {
    this.setupHandlers();
    this.bot.start();
    this.logger.log('Telegram bot started successfully');
  }

  private setupHandlers() {
    // Start command
    this.bot.command('start', async (ctx) => {
      await this.handleStart(ctx);
    });

    // Admin commands
    this.bot.command('add_barber', async (ctx) => {
      await this.handleAddBarber(ctx);
    });

    this.bot.command('list_barbers', async (ctx) => {
      await this.handleListBarbers(ctx);
    });

    // Callback query handlers
    this.bot.callbackQuery(/^barbershop_\d+$/, async (ctx) => {
      await this.handleBarbershopSelection(ctx);
    });

    this.bot.callbackQuery(/^barber_\d+$/, async (ctx) => {
      await this.handleBarberSelection(ctx);
    });

    this.bot.callbackQuery(/^date_.+$/, async (ctx) => {
      await this.handleDateSelection(ctx);
    });

    this.bot.callbackQuery(/^time_.+$/, async (ctx) => {
      await this.handleTimeSelection(ctx);
    });

    this.bot.callbackQuery(/^approve_\d+$/, async (ctx) => {
      await this.handleApproveBooking(ctx);
    });

    this.bot.callbackQuery(/^reject_\d+$/, async (ctx) => {
      await this.handleRejectBooking(ctx);
    });

    // Error handler
    this.bot.catch((err) => {
      this.logger.error('Bot error:', err);
    });
  }

  private async handleStart(ctx: Context) {
    try {
      const tgId = ctx.from?.id;
      if (!tgId) {
        await ctx.reply('Unable to identify user.');
        return;
      }

      // Register or get client
      const fullName = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim();
      await this.clientService.create({
        tgId,
        fullName: fullName || undefined,
        username: ctx.from.username || undefined,
      });

      // Show barbershops
      const barbershops = await this.barbershopService.findAll();
      
      if (barbershops.length === 0) {
        await ctx.reply('No barbershops available at the moment.');
        return;
      }

      const keyboard = new InlineKeyboard();
      barbershops.forEach((shop) => {
        keyboard.text(shop.name, `barbershop_${shop.id}`).row();
      });

      await ctx.reply('Welcome! Please select a barbershop:', {
        reply_markup: keyboard,
      });
    } catch (error) {
      this.logger.error('Error in handleStart:', error);
      await ctx.reply('An error occurred. Please try again.');
    }
  }

  private async handleBarbershopSelection(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('barbershop_')) return;

      const match = data.match(/^barbershop_(\d+)$/);
      if (!match) return;

      const barbershopId = parseInt(match[1], 10);
      const tgId = ctx.from?.id;
      if (!tgId) return;

      // Store selection in session
      if (!this.userSessions.has(tgId)) {
        this.userSessions.set(tgId, {});
      }
      this.userSessions.get(tgId)!.barbershopId = barbershopId;

      // Get barbers for this barbershop
      const barbers = await this.barberService.findByBarbershop(barbershopId);

      if (barbers.length === 0) {
        await ctx.editMessageText('No barbers available at this barbershop.');
        return;
      }

      const keyboard = new InlineKeyboard();
      barbers.forEach((barber) => {
        keyboard.text(barber.name, `barber_${barber.id}`).row();
      });

      await ctx.editMessageText('Please select a barber:', {
        reply_markup: keyboard,
      });
    } catch (error) {
      this.logger.error('Error in handleBarbershopSelection:', error);
      await ctx.answerCallbackQuery({ text: 'An error occurred.' });
    }
  }

  private async handleBarberSelection(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('barber_')) return;

      const match = data.match(/^barber_(\d+)$/);
      if (!match) return;

      const barberId = parseInt(match[1], 10);
      const tgId = ctx.from?.id;
      if (!tgId) return;

      // Store selection in session
      if (!this.userSessions.has(tgId)) {
        this.userSessions.set(tgId, {});
      }
      this.userSessions.get(tgId)!.barberId = barberId;

      // Generate date options (next 7 days)
      const dates = this.generateDateOptions();
      const keyboard = new InlineKeyboard();
      dates.forEach((date) => {
        const dateStr = date.toISOString().split('T')[0];
        const displayDate = date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        keyboard.text(displayDate, `date_${dateStr}`).row();
      });

      await ctx.editMessageText('Please select a date:', {
        reply_markup: keyboard,
      });
    } catch (error) {
      this.logger.error('Error in handleBarberSelection:', error);
      await ctx.answerCallbackQuery({ text: 'An error occurred.' });
    }
  }

  private async handleDateSelection(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('date_')) return;

      const match = data.match(/^date_(.+)$/);
      if (!match) return;

      const date = match[1];
      const tgId = ctx.from?.id;
      if (!tgId) return;

      const session = this.userSessions.get(tgId);
      if (!session || !session.barberId) {
        await ctx.answerCallbackQuery({ text: 'Session expired. Please start over.' });
        return;
      }

      session.date = date;

      // Get available time slots
      const availableSlots = await this.bookingService.getAvailableTimeSlots(
        session.barberId,
        date,
      );

      if (availableSlots.length === 0) {
        await ctx.editMessageText('No available time slots for this date. Please select another date.');
        return;
      }

      const keyboard = new InlineKeyboard();
      availableSlots.forEach((time) => {
        keyboard.text(time, `time_${time}`).row();
      });

      await ctx.editMessageText('Please select a time slot:', {
        reply_markup: keyboard,
      });
    } catch (error) {
      this.logger.error('Error in handleDateSelection:', error);
      await ctx.answerCallbackQuery({ text: 'An error occurred.' });
    }
  }

  private async handleTimeSelection(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('time_')) return;

      const match = data.match(/^time_(.+)$/);
      if (!match) return;

      const time = match[1];
      const tgId = ctx.from?.id;
      if (!tgId) return;

      const session = this.userSessions.get(tgId);
      if (!session || !session.barberId || !session.date) {
        await ctx.answerCallbackQuery({ text: 'Session expired. Please start over.' });
        return;
      }

      session.time = time;

      // Get client
      const client = await this.clientService.findByTgId(tgId);
      if (!client) {
        await ctx.answerCallbackQuery({ text: 'Client not found.' });
        return;
      }

      // Create booking
      const booking = await this.bookingService.create({
        clientId: client.id,
        barberId: session.barberId,
        date: session.date,
        time: session.time,
      });

      // Get barber info
      const barber = await this.barberService.findOne(session.barberId);
      if (!barber) {
        await ctx.editMessageText('Barber not found.');
        return;
      }

      // Send notification to barber
      await this.sendBookingNotificationToBarber(barber.tgId, booking.id, client, session.date, session.time);

      // Clear session
      this.userSessions.delete(tgId);

      await ctx.editMessageText(
        `✅ Booking created successfully!\n\n` +
        `Barber: ${barber.name}\n` +
        `Date: ${session.date}\n` +
        `Time: ${session.time}\n\n` +
        `Waiting for barber confirmation...`,
      );
    } catch (error) {
      this.logger.error('Error in handleTimeSelection:', error);
      await ctx.answerCallbackQuery({ text: 'An error occurred while creating booking.' });
    }
  }

  private async handleApproveBooking(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('approve_')) return;

      const match = data.match(/^approve_(\d+)$/);
      if (!match) return;

      const bookingId = parseInt(match[1], 10);
      const booking = await this.bookingService.approve(bookingId);

      if (!booking) {
        await ctx.answerCallbackQuery({ text: 'Booking not found.' });
        return;
      }

      // Get client and barber info
      const client = await this.clientService.findOne(booking.clientId);
      const barber = await this.barberService.findOne(booking.barberId);

      if (!client || !barber) {
        await ctx.answerCallbackQuery({ text: 'Error fetching booking details.' });
        return;
      }

      // Notify client
      await this.bot.api.sendMessage(
        client.tgId,
        `✅ Your booking has been approved!\n\n` +
        `Barber: ${barber.name}\n` +
        `Date: ${booking.date}\n` +
        `Time: ${booking.time}`,
      );

      // Update barber's message
      await ctx.editMessageText(
        `✅ Booking approved\n\n` +
        `Client: ${client.fullName || 'Unknown'}\n` +
        `Date: ${booking.date}\n` +
        `Time: ${booking.time}`,
      );

      await ctx.answerCallbackQuery({ text: 'Booking approved!' });
    } catch (error) {
      this.logger.error('Error in handleApproveBooking:', error);
      await ctx.answerCallbackQuery({ text: 'An error occurred.' });
    }
  }

  private async handleRejectBooking(ctx: Context) {
    try {
      const data = ctx.callbackQuery?.data;
      if (!data || !data.startsWith('reject_')) return;

      const match = data.match(/^reject_(\d+)$/);
      if (!match) return;

      const bookingId = parseInt(match[1], 10);
      const booking = await this.bookingService.reject(bookingId);

      if (!booking) {
        await ctx.answerCallbackQuery({ text: 'Booking not found.' });
        return;
      }

      // Get client and barber info
      const client = await this.clientService.findOne(booking.clientId);
      const barber = await this.barberService.findOne(booking.barberId);

      if (!client || !barber) {
        await ctx.answerCallbackQuery({ text: 'Error fetching booking details.' });
        return;
      }

      // Notify client
      await this.bot.api.sendMessage(
        client.tgId,
        `❌ Your booking has been rejected.\n\n` +
        `Barber: ${barber.name}\n` +
        `Date: ${booking.date}\n` +
        `Time: ${booking.time}\n\n` +
        `Please try booking another time slot.`,
      );

      // Update barber's message
      await ctx.editMessageText(
        `❌ Booking rejected\n\n` +
        `Client: ${client.fullName || 'Unknown'}\n` +
        `Date: ${booking.date}\n` +
        `Time: ${booking.time}`,
      );

      await ctx.answerCallbackQuery({ text: 'Booking rejected.' });
    } catch (error) {
      this.logger.error('Error in handleRejectBooking:', error);
      await ctx.answerCallbackQuery({ text: 'An error occurred.' });
    }
  }

  private async handleAddBarber(ctx: Context) {
    try {
      const adminId = parseInt(this.configService.get<string>('ADMIN_TG_ID') || '0', 10);
      const tgId = ctx.from?.id;

      if (!tgId || tgId !== adminId) {
        await ctx.reply('You are not authorized to use this command.');
        return;
      }

      const text = ctx.message?.text || '';
      const parts = text.split(' ').slice(1);

      if (parts.length < 3) {
        await ctx.reply(
          'Usage: /add_barber <name> <telegram_id> <barbershop_id>\n\n' +
          'Example: /add_barber John Doe 123456789 1',
        );
        return;
      }

      const [name, tgIdStr, barbershopIdStr] = parts;
      const barberTgId = parseInt(tgIdStr, 10);
      const barbershopId = parseInt(barbershopIdStr, 10);

      if (isNaN(barberTgId) || isNaN(barbershopId)) {
        await ctx.reply('Invalid telegram_id or barbershop_id.');
        return;
      }

      const barber = await this.barberService.create({
        name,
        tgId: barberTgId,
        barbershopId,
      });

      await ctx.reply(`✅ Barber "${barber.name}" added successfully!`);
    } catch (error) {
      this.logger.error('Error in handleAddBarber:', error);
      await ctx.reply('An error occurred while adding barber.');
    }
  }

  private async handleListBarbers(ctx: Context) {
    try {
      const adminId = parseInt(this.configService.get<string>('ADMIN_TG_ID') || '0', 10);
      const tgId = ctx.from?.id;

      if (!tgId || tgId !== adminId) {
        await ctx.reply('You are not authorized to use this command.');
        return;
      }

      const barbers = await this.barberService.findAll();

      if (barbers.length === 0) {
        await ctx.reply('No barbers found.');
        return;
      }

      let message = '📋 List of Barbers:\n\n';
      barbers.forEach((barber, index) => {
        message += `${index + 1}. ${barber.name}\n`;
        message += `   Telegram ID: ${barber.tgId}\n`;
        message += `   Barbershop: ${barber.barbershop?.name || 'N/A'}\n\n`;
      });

      await ctx.reply(message);
    } catch (error) {
      this.logger.error('Error in handleListBarbers:', error);
      await ctx.reply('An error occurred while fetching barbers.');
    }
  }

  private async sendBookingNotificationToBarber(
    barberTgId: number,
    bookingId: number,
    client: any,
    date: string,
    time: string,
  ) {
    try {
      const keyboard = new InlineKeyboard();
      keyboard.text('✔ Approve', `approve_${bookingId}`).text('❌ Reject', `reject_${bookingId}`);

      await this.bot.api.sendMessage(
        barberTgId,
        `📅 New Booking Request\n\n` +
        `Client: ${client.fullName || 'Unknown'}\n` +
        `Date: ${date}\n` +
        `Time: ${time}\n\n` +
        `Please approve or reject:`,
        {
          reply_markup: keyboard,
        },
      );
    } catch (error) {
      this.logger.error('Error sending notification to barber:', error);
    }
  }

  private generateDateOptions(): Date[] {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }

    return dates;
  }
}

