import { Context, InlineKeyboard } from 'grammy';
import { ClientService } from '../../client/client.service';
import { BarberService } from '../../barber/barber.service';
import { BarberServiceService } from '../../barber-service/barber-service.service';
import { BarberService as BarberServiceEntity } from '../../barber-service/entities/barber-service.entity';
import { BookingService } from '../../booking/booking.service';
import { BookingStatus } from '../../../common/enums/booking-status.enum';
import { ConfigService } from '@nestjs/config';
import { getClientMainMenu } from '../keyboards/main.menu';

export class BookingHandler {
  private bookingStates = new Map<
    number,
    {
      step: 'service' | 'barber' | 'date' | 'time' | 'time_input';
      serviceIds?: number[];
      barberId?: number;
      date?: string;
    }
  >();

  constructor(
    private clientService: ClientService,
    private barberService: BarberService,
    private barberServiceService: BarberServiceService,
    private bookingService: BookingService,
    private configService: ConfigService,
  ) {}

  async handleBookService(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const client = await this.clientService.findByTgId(tgId);
    if (!client) {
      return ctx.reply("Iltimos, avval ro'yxatdan o'ting: /start");
    }

    // Get all services
    const services = await this.barberServiceService.findAll();
    if (services.length === 0) {
      return ctx.reply("Hozircha mavjud xizmatlar yo'q.");
    }

    // Create inline keyboard for services (multiple selection)
    const keyboard = new InlineKeyboard();
    services.forEach((service) => {
      keyboard
        .text(
          `☐ ${service.name} - ${service.price} so'm (${service.duration} min)`,
          `service_toggle_${service.id}`,
        )
        .row();
    });
    keyboard.text('✅ Davom etish', 'service_continue').row();

    if (!ctx.from) return;
    this.bookingStates.set(ctx.from.id, { step: 'service', serviceIds: [] });
    return ctx.reply(
      'Xizmatlarni tanlang (bir nechta tanlash mumkin):\n\nTanlangan xizmatlar: 0',
      { reply_markup: keyboard },
    );
  }

  async handleServiceToggle(ctx: Context, serviceId: number) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.bookingStates.get(ctx.from.id);
    if (!state || state.step !== 'service') return;

    const serviceIds = state.serviceIds || [];
    const serviceIndex = serviceIds.indexOf(serviceId);

    if (serviceIndex > -1) {
      // Remove service
      serviceIds.splice(serviceIndex, 1);
    } else {
      // Add service
      serviceIds.push(serviceId);
    }

    this.bookingStates.set(ctx.from.id, {
      ...state,
      serviceIds,
    });

    // Get all services to update keyboard
    const services = await this.barberServiceService.findAll();
    const keyboard = new InlineKeyboard();

    services.forEach((service) => {
      const isSelected = serviceIds.includes(service.id);
      keyboard
        .text(
          `${isSelected ? '☑' : '☐'} ${service.name} - ${service.price} so'm (${service.duration} min)`,
          `service_toggle_${service.id}`,
        )
        .row();
    });

    keyboard.text('✅ Davom etish', 'service_continue').row();

    const selectedServices: BarberServiceEntity[] = services.filter((s) =>
      serviceIds.includes(s.id),
    );
    const totalPrice = selectedServices.reduce(
      (sum, s) => sum + Number(s.price),
      0,
    );
    const totalDuration = selectedServices.reduce(
      (sum, s) => sum + s.duration,
      0,
    );

    let message = 'Xizmatlarni tanlang (bir nechta tanlash mumkin):\n\n';
    if (selectedServices.length > 0) {
      message += 'Tanlangan xizmatlar:\n';
      selectedServices.forEach((s) => {
        message += `• ${s.name} - ${s.price} so'm (${s.duration} min)\n`;
      });
      message += `\nJami: ${totalPrice} so'm, ${totalDuration} daqiqa\n`;
    } else {
      message += 'Tanlangan xizmatlar: 0\n';
    }

    return ctx.editMessageText(message, { reply_markup: keyboard });
  }

  async handleServiceContinue(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.bookingStates.get(ctx.from.id);
    if (!state || state.step !== 'service') return;

    const serviceIds = state.serviceIds || [];
    if (serviceIds.length === 0) {
      return ctx.reply('Iltimos, kamida bitta xizmat tanlang.');
    }

    const client = await this.clientService.findByTgId(tgId);
    if (!client) return;

    // Get selected services
    const selectedServices: BarberServiceEntity[] = [];
    for (const serviceId of serviceIds) {
      const service = await this.barberServiceService.findOne(serviceId);
      if (service) {
        selectedServices.push(service);
      }
    }

    if (selectedServices.length === 0) {
      return ctx.reply('Xizmatlar topilmadi.');
    }

    // Get working barbers
    const barbers = await this.barberService.findWorkingBarbers();
    if (barbers.length === 0) {
      return ctx.reply(
        "Hozircha ishlayotgan barberlar yo'q. Iltimos, keyinroq urinib ko'ring.",
      );
    }

    // Create inline keyboard for barbers
    const keyboard = new InlineKeyboard();
    barbers.forEach((barber) => {
      keyboard
        .text(
          `${barber.name}${barber.tg_username ? ` (@${barber.tg_username})` : ''}`,
          `barber_${barber.id}_${serviceIds.join(',')}`,
        )
        .row();
    });

    this.bookingStates.set(ctx.from.id, {
      step: 'barber',
      serviceIds,
    });

    let message = 'Tanlangan xizmatlar:\n';
    selectedServices.forEach((s) => {
      message += `• ${s.name} - ${s.price} so'm (${s.duration} min)\n`;
    });
    const totalPrice = selectedServices.reduce(
      (sum, s) => sum + Number(s.price),
      0,
    );
    const totalDuration = selectedServices.reduce(
      (sum, s) => sum + s.duration,
      0,
    );
    message += `\nJami: ${totalPrice} so'm, ${totalDuration} daqiqa\n\nBarberni tanlang:`;

    return ctx.reply(message, { reply_markup: keyboard });
  }

  async handleBarberSelection(
    ctx: Context,
    barberId: number,
    serviceIds: number[],
  ) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const client = await this.clientService.findByTgId(tgId);
    if (!client) return;

    const barber = await this.barberService.findOne(barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    if (!barber.working) {
      return ctx.reply('Bu barber hozir ishlamayapti.');
    }

    // Get selected services
    const selectedServices: BarberServiceEntity[] = [];
    for (const serviceId of serviceIds) {
      const service = await this.barberServiceService.findOne(serviceId);
      if (service) {
        selectedServices.push(service);
      }
    }

    if (selectedServices.length === 0) {
      return ctx.reply('Xizmatlar topilmadi.');
    }

    // Generate available time slots for today and next 7 days
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]); // yyyy-mm-dd
    }

    // Create inline keyboard for dates
    const keyboard = new InlineKeyboard();
    dates.forEach((date) => {
      const dateDisplay = new Date(date).toLocaleDateString('uz-UZ', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      keyboard
        .text(dateDisplay, `date_${date}_${barberId}_${serviceIds.join(',')}`)
        .row();
    });

    this.bookingStates.set(ctx.from.id, {
      step: 'date',
      serviceIds,
    });

    let message = `Barber: ${barber.name}\n\nTanlangan xizmatlar:\n`;
    selectedServices.forEach((s) => {
      message += `• ${s.name} - ${s.price} so'm (${s.duration} min)\n`;
    });
    const totalPrice = selectedServices.reduce(
      (sum, s) => sum + Number(s.price),
      0,
    );
    const totalDuration = selectedServices.reduce(
      (sum, s) => sum + s.duration,
      0,
    );
    message += `\nJami: ${totalPrice} so'm, ${totalDuration} daqiqa\n\nSanani tanlang:`;

    return ctx.reply(message, { reply_markup: keyboard });
  }

  async handleDateSelection(
    ctx: Context,
    date: string,
    barberId: number,
    serviceIdsStr: string,
  ) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const client = await this.clientService.findByTgId(tgId);
    if (!client) return;

    const serviceIds = serviceIdsStr.split(',').map((id) => parseInt(id));

    // Get selected services
    const selectedServices: BarberServiceEntity[] = [];
    for (const serviceId of serviceIds) {
      const service = await this.barberServiceService.findOne(serviceId);
      if (service) {
        selectedServices.push(service);
      }
    }

    if (selectedServices.length === 0) {
      return ctx.reply('Xizmatlar topilmadi.');
    }

    // Calculate total duration
    const totalDuration = selectedServices.reduce(
      (sum, s) => sum + s.duration,
      0,
    );

    // Generate time slots
    const timeSlots: string[] = [];
    for (let hour = 9; hour < 18; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    // Check availability for each time slot (considering total duration)
    const availableSlots: string[] = [];
    for (const time of timeSlots) {
      const isAvailable = await this.bookingService.checkTimeSlotAvailability(
        barberId,
        date,
        time,
        totalDuration,
      );
      if (isAvailable) {
        availableSlots.push(time);
      }
    }

    if (availableSlots.length === 0) {
      return ctx.reply(
        "Ushbu kunda bo'sh vaqtlar mavjud emas. Iltimos, boshqa sanani tanlang.",
      );
    }

    // Create inline keyboard for available times
    const keyboard = new InlineKeyboard();
    availableSlots.forEach((time) => {
      keyboard
        .text(time, `time_${date}_${time}_${barberId}_${serviceIdsStr}`)
        .row();
    });
    keyboard
      .text(
        "⌨️ Vaqtni o'zim kiritaman",
        `time_input_${date}_${barberId}_${serviceIdsStr}`,
      )
      .row();

    this.bookingStates.set(ctx.from.id, {
      step: 'time',
      serviceIds,
      barberId,
      date,
    });

    return ctx.reply(
      `Sanani tanladingiz: ${date}\n\nJami davomiyligi: ${totalDuration} daqiqa\n\nBo'sh vaqtlarni tanlang yoki o'zingiz kiriting:`,
      { reply_markup: keyboard },
    );
  }

  async handleTimeSelection(
    ctx: Context,
    date: string,
    time: string,
    barberId: number,
    serviceIds: number[],
  ) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const client = await this.clientService.findByTgId(tgId);
    if (!client) return;

    const barber = await this.barberService.findOne(barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    // Get selected services
    const selectedServices: BarberServiceEntity[] = [];
    for (const serviceId of serviceIds) {
      const service = await this.barberServiceService.findOne(serviceId);
      if (service) {
        selectedServices.push(service);
      }
    }

    if (selectedServices.length === 0) {
      return ctx.reply('Xizmatlar topilmadi.');
    }

    // Calculate total duration
    const totalDuration = selectedServices.reduce(
      (sum, s) => sum + s.duration,
      0,
    );

    // Final availability check (considering total duration)
    const isAvailable = await this.bookingService.checkTimeSlotAvailability(
      barberId,
      date,
      time,
      totalDuration,
    );

    if (!isAvailable) {
      return ctx.reply('Ushbu vaqt band. Iltimos, boshqa vaqtni tanlang.');
    }

    // Create bookings for each service (automatically approved)
    try {
      const createdBookings: Awaited<
        ReturnType<typeof this.bookingService.create>
      >[] = [];
      for (const service of selectedServices) {
        const booking = await this.bookingService.create({
          client_id: client.id,
          barber_id: barberId,
          service_id: service.id,
          date,
          time,
          status: BookingStatus.APPROVED,
        });
        createdBookings.push(booking);
      }

      // Clear booking state
      this.bookingStates.delete(ctx.from.id);

      // Notify admin
      const adminTgId = this.configService.get<string>('ADMIN_TG_ID');
      if (adminTgId) {
        const totalPrice = selectedServices.reduce(
          (sum, s) => sum + Number(s.price),
          0,
        );
        let adminMessage =
          `🆕 New booking:\n\n` +
          `Client: ${client.full_name}${client.tg_username ? ` (@${client.tg_username})` : ''}\n` +
          `Services:\n`;
        selectedServices.forEach((s) => {
          adminMessage += `• ${s.name} (${s.duration} min) - ${s.price} so'm\n`;
        });
        adminMessage +=
          `\nTotal: ${totalPrice} so'm, ${totalDuration} min\n` +
          `Barber: ${barber.name}${barber.tg_username ? ` (@${barber.tg_username})` : ''}\n` +
          `Date: ${date}\n` +
          `Time: ${time}`;

        await ctx.api.sendMessage(adminTgId, adminMessage);
      }

      const totalPrice = selectedServices.reduce(
        (sum, s) => sum + Number(s.price),
        0,
      );
      let message =
        `✅ ${createdBookings.length} ta booking muvaffaqiyatli yaratildi!\n\n` +
        `Barber: ${barber.name}\n` +
        `Xizmatlar:\n`;
      selectedServices.forEach((s) => {
        message += `• ${s.name} - ${s.price} so'm (${s.duration} min)\n`;
      });
      message +=
        `\nJami: ${totalPrice} so'm, ${totalDuration} daqiqa\n` +
        `Date: ${date}\n` +
        `Time: ${time}\n` +
        `Status: approved ✅`;

      const menu = getClientMainMenu();
      return ctx.reply(message, { reply_markup: menu });
    } catch (error) {
      return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }
  }

  async handleMyBookings(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const client = await this.clientService.findByTgId(tgId);
    if (!client) {
      return ctx.reply("Iltimos, avval ro'yxatdan o'ting: /start");
    }

    const bookings = await this.bookingService.findByClientId(client.id);

    if (bookings.length === 0) {
      return ctx.reply("Sizda hozircha bookinglar yo'q.");
    }

    let message = '📋 Sizning bookinglaringiz:\n\n';
    bookings.forEach((booking, index) => {
      message +=
        `${index + 1}. ` +
        `Barber: ${booking.barber.name}${booking.barber.tg_username ? ` (@${booking.barber.tg_username})` : ''}\n` +
        `Service: ${booking.service.name}\n` +
        `Price: ${booking.service.price} so'm\n` +
        `Duration: ${booking.service.duration} daqiqa\n` +
        `Date: ${booking.date}\n` +
        `Time: ${booking.time}\n` +
        `Status: ${booking.status}\n\n`;
    });

    return ctx.reply(message);
  }

  async handleTimeInput(
    ctx: Context,
    date: string,
    barberId: number,
    serviceIdsStr: string,
  ) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const serviceIds = serviceIdsStr.split(',').map((id) => parseInt(id));

    this.bookingStates.set(ctx.from.id, {
      step: 'time_input',
      serviceIds,
      barberId,
      date,
    });

    return ctx.reply(
      "Vaqtni kiriting (HH:mm formatida):\n\nMasalan: 14:30\n\nIltimos, 09:00 - 18:00 oralig'idagi vaqtni kiriting.",
    );
  }

  async handleTimeInputText(ctx: Context, timeText: string) {
    const userId = ctx.from?.id;
    if (!userId) return false;

    const state = this.bookingStates.get(userId);
    if (!state || state.step !== 'time_input') return false;

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeText)) {
      return ctx.reply(
        "Noto'g'ri vaqt formati. Iltimos, HH:mm formatida kiriting.\n\nMasalan: 14:30",
      );
    }

    const [hours, minutes] = timeText.split(':').map(Number);

    // Check if time is within working hours (9:00 - 18:00)
    if (hours < 9 || hours >= 18) {
      return ctx.reply(
        "Vaqt ish vaqti oralig'ida bo'lishi kerak (09:00 - 18:00).",
      );
    }

    // Use the stored state data
    const { serviceIds, barberId, date } = state;
    if (!serviceIds || !barberId || !date) {
      return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }

    // Call handleTimeSelection with the entered time
    await this.handleTimeSelection(ctx, date, timeText, barberId, serviceIds);
    return true;
  }

  isInBookingFlow(userId: number): boolean {
    return this.bookingStates.has(userId);
  }
}
