import { Context, InlineKeyboard } from 'grammy';
import { UserService } from '../../user/user.service';
import { UserRole } from '../../../common/enums/user.enum';
import { BarberServiceService } from '../../barber-service/barber-service.service';
import { BarberService as BarberServiceEntity } from '../../barber-service/entities/barber-service.entity';
import { BookingService } from '../../booking/booking.service';
import { BookingStatus } from '../../../common/enums/booking-status.enum';
import { ConfigService } from '@nestjs/config';
import { getClientMainMenu, getBarberMainMenu, getAdminMainMenu } from '../keyboards/main.menu';

export class BookingHandler {
  private bookingStates = new Map<
    number,
    {
      step: 'barber' | 'service' | 'date' | 'time' | 'time_input' | 'comment';
      barberId?: number;
      serviceIds?: number[];
      date?: string;
      bookingIds?: number[]; // Yaratilgan booking ID'lari
    }
  >();

  constructor(
    private userService: UserService,
    private barberServiceService: BarberServiceService,
    private bookingService: BookingService,
    private configService: ConfigService,
  ) {}

  async handleBookService(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const client = await this.userService.findClientByTgId(tgId);
    if (!client) {
      return ctx.reply("Iltimos, avval ro'yxatdan o'ting: /start");
    }

    // Get working barbers
    const barbers = await this.userService.findWorkingBarbers();
    if (barbers.length === 0) {
      return ctx.reply(
        "Hozircha ishlayotgan barberlar yo'q. Iltimos, keyinroq urinib ko'ring.",
      );
    }

    // Create inline keyboard for barbers
    const keyboard = new InlineKeyboard();
    barbers.forEach((barber) => {
      const workTime = barber.work_start_time && barber.work_end_time
        ? ` (${barber.work_start_time} - ${barber.work_end_time})`
        : '';
      const usernameDisplay = barber.tg_username ? ` (@${barber.tg_username})` : '';
      keyboard
        .text(
          `👤 ${barber.name}${usernameDisplay}${workTime}`,
          `barber_select_${barber.id}`,
        )
        .row();
    });
    keyboard.text('⬅️ Ortga qaytish', 'menu_back').row();

    if (!ctx.from) return;
    this.bookingStates.set(ctx.from.id, { step: 'barber' });

    const message = `
<b>💈 Barberni tanlang</b>

Iltimos, xizmat olish uchun barberni tanlang:

━━━━━━━━━━━━━━━━━━
`;

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleServiceToggle(ctx: Context, serviceId: number) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.bookingStates.get(ctx.from.id);
    if (!state || state.step !== 'service' || !state.barberId) return;

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

    const barber = await this.userService.findOne(state.barberId);
    if (!barber) return;

    // Get all services to update keyboard
    const services = await this.barberServiceService.findAll();
    const keyboard = new InlineKeyboard();

    services.forEach((service) => {
      const isSelected = serviceIds.includes(service.id);
      keyboard
        .text(
          `${isSelected ? '🟩' : '⬜'} ${service.name} — ${service.price} so'm (${service.duration} min)`,
          `service_toggle_${service.id}`,
        )
        .row();
    });

    keyboard
      .text('⬅️ Ortga qaytish', 'back_to_barbers')
      .text('✅ Davom etish', 'service_continue')
      .row();

    const selectedServices: BarberServiceEntity[] = services.filter((s) =>
      serviceIds.includes(s.id),
    );
    const selectedCount = selectedServices.length;

    const workTime = barber.work_start_time && barber.work_end_time
      ? `\n🕒 <b>Ish vaqti:</b> ${barber.work_start_time} - ${barber.work_end_time}`
      : '';

    const message = `
<b>💈 Barber:</b> ${barber.name}${workTime}

━━━━━━━━━━━━━━━━━━

<b>✂️ Xizmatlarni tanlang</b>

<i>(bir nechta tanlash mumkin)</i>

📌 <b>Tanlangan xizmatlar:</b> ${selectedCount}

━━━━━━━━━━━━━━━━━━
`;

    return ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  }

  async handleBarberSelect(ctx: Context, barberId: number) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const barber = await this.userService.findOne(barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    if (!barber.working) {
      return ctx.reply('Bu barber hozir ishlamayapti.');
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
          `⬜ ${service.name} — ${service.price} so'm (${service.duration} min)`,
          `service_toggle_${service.id}`,
        )
        .row();
    });
    keyboard
      .text('⬅️ Ortga qaytish', 'back_to_barbers')
      .text('✅ Davom etish', 'service_continue')
      .row();

    this.bookingStates.set(ctx.from.id, {
      step: 'service',
      barberId,
      serviceIds: [],
    });

    const workTime = barber.work_start_time && barber.work_end_time
      ? `\n🕒 <b>Ish vaqti:</b> ${barber.work_start_time} - ${barber.work_end_time}`
      : '';

    const message = `
<b>💈 Barber:</b> ${barber.name}${workTime}

━━━━━━━━━━━━━━━━━━

<b>✂️ Xizmatlarni tanlang</b>

<i>(bir nechta tanlash mumkin)</i>

📌 <b>Tanlangan xizmatlar:</b> 0

━━━━━━━━━━━━━━━━━━
`;

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleServiceContinue(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.bookingStates.get(ctx.from.id);
    if (!state || state.step !== 'service' || !state.barberId) return;

    const serviceIds = state.serviceIds || [];
    if (serviceIds.length === 0) {
      return ctx.reply('Iltimos, kamida bitta xizmat tanlang.');
    }

    const barber = await this.userService.findOne(state.barberId);
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

    // Calculate totals
    const totalPrice = selectedServices.reduce(
      (sum, s) => sum + Number(s.price),
      0,
    );
    const totalDuration = selectedServices.reduce(
      (sum, s) => sum + s.duration,
      0,
    );

    // Format services list
    const servicesList = selectedServices
      .map((s) => `✂️ ${s.name} — ${s.price} so'm (${s.duration} min)`)
      .join('\n');

    const workTime = barber.work_start_time && barber.work_end_time
      ? `\n🕒 <b>Ish vaqti:</b> ${barber.work_start_time} - ${barber.work_end_time}`
      : '';

    // Premium card message
    const message = `
<b>💈 Barber:</b> ${barber.name}${workTime}

<b>🧾 Tanlangan xizmatlar</b>

━━━━━━━━━━━━━━━━━━
${servicesList}
━━━━━━━━━━━━━━━━━━

💰 <b>Jami narx:</b> ${totalPrice} so'm
⏱ <b>Jami vaqt:</b> ${totalDuration} daqiqa

📅 <b>Sana tanlang:</b>
`;

    // Generate available time slots for today and next 7 days
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    // Create premium inline keyboard for dates (2 columns)
    const keyboard = new InlineKeyboard();
    dates.forEach((date, index) => {
      const dateObj = new Date(date + 'T00:00:00'); // Timezone muammosini hal qilish
      const weekday = dateObj.toLocaleDateString('uz-UZ', {
        weekday: 'short',
      });
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString('uz-UZ', {
        month: 'short',
      });
      const dateDisplay = `📅 ${weekday} • ${day}-${month}`;
      
      // Har ikkinchi tugmadan keyin yangi qator
      if (index % 2 === 0) {
        keyboard.text(
          dateDisplay,
          `date_${date}_${state.barberId}_${serviceIds.join(',')}`,
        );
      } else {
        keyboard
          .text(
            dateDisplay,
            `date_${date}_${state.barberId}_${serviceIds.join(',')}`,
          )
          .row();
      }
    });
    
    // Agar tugmalar soni toq bo'lsa, oxirgi qatorni yopish
    if (dates.length % 2 !== 0) {
      keyboard.row();
    }
    keyboard.text('⬅️ Ortga qaytish', 'back_to_services').row();

    this.bookingStates.set(ctx.from.id, {
      step: 'date',
      barberId: state.barberId,
      serviceIds,
    });

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }


  async handleDateSelection(
    ctx: Context,
    date: string,
    barberId: number,
    serviceIdsStr: string,
  ) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const client = await this.userService.findClientByTgId(tgId);
    if (!client) return;

    const barber = await this.userService.findOne(barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

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

    // Generate time slots based on barber's work hours
    const timeSlots: string[] = [];
    const startHour = barber.work_start_time 
      ? parseInt(barber.work_start_time.split(':')[0])
      : 9;
    const endHour = barber.work_end_time
      ? parseInt(barber.work_end_time.split(':')[0])
      : 18;

    for (let hour = startHour; hour < endHour; hour++) {
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

    // Format selected date
    const dateObj = new Date(date + 'T00:00:00');
    const selectedDate = dateObj.toLocaleDateString('uz-UZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Premium card message
    const message = `
📅 <b>Sana:</b> ${selectedDate}

⏱ <b>Xizmat davomiyligi:</b> ${totalDuration} daqiqa

<b>🕔 Bo'sh vaqtlar</b>

Quyidagi vaqtlardan birini tanlang:

━━━━━━━━━━━━━━━━━━
`;

    // Create premium inline keyboard for available times (3 columns)
    const keyboard = new InlineKeyboard();
    availableSlots.forEach((time, index) => {
      // Har uchinchi tugmadan keyin yangi qator (index 2, 5, 8, ...)
      if (index > 0 && index % 3 === 0) {
        keyboard.row();
      }
      keyboard.text(`🕒 ${time}`, `time_${date}_${time}_${barberId}_${serviceIdsStr}`);
    });
    
    // Agar tugmalar soni 3 ga bo'linmasa, oxirgi qatorni yopish
    if (availableSlots.length % 3 !== 0) {
      keyboard.row();
    }
    
    // Vaqtni o'zim kiritaman tugmasi (alohida qatorda, to'liq kenglikda)
    keyboard
      .row()
      .text(
        "✏️ Vaqtni o'zim kiritaman",
        `time_input_${date}_${barberId}_${serviceIdsStr}`,
      )
      .row();
    
    // Ortga qaytish tugmasi (alohida qatorda)
    keyboard.text('⬅️ Ortga qaytish', `back_to_date_${barberId}_${serviceIdsStr}`).row();

    this.bookingStates.set(ctx.from.id, {
      step: 'time',
      serviceIds,
      barberId,
      date,
    });

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
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

    const client = await this.userService.findClientByTgId(tgId);
    if (!client) return;

    if (!client.phone_number) {
      return ctx.reply('Telefon raqamingiz ro\'yxatdan o\'tmagan. Iltimos, profilni yangilang.');
    }

    const phoneNumber = client.phone_number; // TypeScript uchun

    const barber = await this.userService.findOne(barberId);
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

      // Create bookings for each service
    try {
      const booking = await this.bookingService.create({
        phone_number: phoneNumber,
        barber_id: barberId,
        service_ids: selectedServices.map(s => s.id),
        date,
        time,
      });
      
      const createdBookings = Array.isArray(booking) ? booking : [booking];

      // Clear booking state - comment so'ralmaydi, booking yakunlangandan keyin so'raladi
      this.bookingStates.delete(ctx.from.id);

      // Admin'larga xabar booking.service.ts ichidagi notifyAdmins metodi orqali yuboriladi

      // Notify barber if tg_id exists
      if (barber.tg_id) {
        const totalPrice = selectedServices.reduce(
          (sum, s) => sum + Number(s.price),
          0,
        );
        
        // Format date for display
        const dateObj = new Date(date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('uz-UZ', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        const barberMessage = `
<b>🆕 Yangi bron yaratildi!</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Mijoz:</b> ${client.name}${client.tg_username ? ` (@${client.tg_username})` : ''}
${client.phone_number ? `📞 <b>Telefon:</b> ${client.phone_number}\n` : ''}
💈 <b>Xizmatlar:</b>
${selectedServices.map(s => `• ${s.name} – ${Number(s.price).toLocaleString()} so'm (${s.duration} daqiqa)`).join('\n')}

💵 <b>Jami:</b> ${totalPrice.toLocaleString()} so'm, ${totalDuration} daqiqa
📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${time}

━━━━━━━━━━━━━━━━━━
`;

        try {
          await ctx.api.sendMessage(barber.tg_id, barberMessage, {
            parse_mode: 'HTML',
          });
        } catch (error: any) {
          // Ignore errors if barber's tg_id is invalid or chat not found (test ma'lumotlari uchun normal)
          if (!error?.description?.includes('chat not found') && !error?.description?.includes('Bad Request')) {
            console.error('Failed to send message to barber:', error);
          }
        }
      }

      const totalPrice = selectedServices.reduce(
        (sum, s) => sum + Number(s.price),
        0,
      );

      // Format date for display
      const dateObj = new Date(date + 'T00:00:00');
      const formattedDate = dateObj.toLocaleDateString('uz-UZ', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      // Status (client booking yaratganda har doim PENDING bo'ladi)
      const statusDisplay = '🟡 <b>PENDING</b>';

      // Premium HTML card message
      const message = `
<b>✅ Booking muvaffaqiyatli yaratildi!</b>

<b>👨‍🔧 Barber:</b> ${barber.name}

<b>💈 Xizmatlar:</b>
${selectedServices.map(s => `• ${s.name} – ${Number(s.price).toLocaleString()} so'm (${s.duration} min)`).join('\n')}

<b>💵 Jami:</b> ${totalPrice.toLocaleString()} so'm, ${totalDuration} daqiqa
<b>📅 Sana:</b> ${formattedDate}
<b>🕒 Vaqt:</b> ${time}

<b>📌 Status:</b> ${statusDisplay}

━━━━━━━━━━━━━━━━━━

⏳ <b>Admin tasdiqlashini kutmoqdasiz...</b>

Xizmat yakunlangandan so'ng sizdan fikringizni so'rashadi.
`;

      const menu = getClientMainMenu();
      return ctx.reply(message, {
        reply_markup: menu,
        parse_mode: 'HTML',
      });
    } catch (error) {
      return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }
  }

  async handleMyBookings(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const client = await this.userService.findClientByTgId(tgId);
    if (!client) {
      return ctx.reply("Iltimos, avval ro'yxatdan o'ting: /start");
    }

    const bookings = await this.bookingService.findByClientId(client.id);

    if (bookings.length === 0) {
      const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'menu_back');
      try {
        return await ctx.editMessageText("Sizda hozircha bookinglar yo'q.", {
          reply_markup: keyboard,
        });
      } catch (error) {
        return ctx.reply("Sizda hozircha bookinglar yo'q.", {
          reply_markup: keyboard,
        });
      }
    }

    // Check for APPROVED bookings without comments
    const approvedWithoutComment = bookings.find(
      (b) => b.status === BookingStatus.APPROVED && !b.comment,
    );

    if (approvedWithoutComment && ctx.from) {
      // Ask for comment for this booking
      this.bookingStates.set(ctx.from.id, {
        step: 'comment',
        bookingIds: [approvedWithoutComment.id],
      });

      const serviceName = approvedWithoutComment.service?.name || 'xizmat';
      const message = `
<b>✅ Xizmat yakunlandi!</b>

━━━━━━━━━━━━━━━━━━

💈 <b>Xizmat:</b> ${serviceName}
👨‍🔧 <b>Barber:</b> ${approvedWithoutComment.barber?.name || 'Noma\'lum'}

━━━━━━━━━━━━━━━━━━

💬 <b>Xizmat haqida fikringizni yozing:</b>

Xizmat sifatini baholash va tavsiyalaringizni qoldiring.
`;

      const skipKeyboard = new InlineKeyboard().text(
        '⏭️ O\'tkazib yuborish',
        'skip_comment',
      );

      try {
        return await ctx.editMessageText(message, {
          reply_markup: skipKeyboard,
          parse_mode: 'HTML',
        });
      } catch (error) {
        return ctx.reply(message, {
          reply_markup: skipKeyboard,
          parse_mode: 'HTML',
        });
      }
    }

    // Format date for display
    const formatDate = (dateStr: string) => {
      const dateObj = new Date(dateStr + 'T00:00:00');
      return dateObj.toLocaleDateString('uz-UZ', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    };

    // Generate premium HTML cards for each booking
    let message = `🗂 <b>Sizning bookinglaringiz:</b>\n\n`;
    
    bookings.forEach((booking, index) => {
      let statusDisplay = '';
      if (booking.status === BookingStatus.APPROVED) {
        statusDisplay = '🟢 APPROVED';
      } else if (booking.status === BookingStatus.REJECTED) {
        statusDisplay = '🔴 REJECTED';
      } else if (booking.status === BookingStatus.CANCELLED) {
        statusDisplay = '⚫ CANCELLED';
      } else {
        statusDisplay = '🟡 PENDING';
      }
      
      const formattedDate = formatDate(booking.date);
      
      message += `
<b>🔹 Booking #${index + 1}</b>

👨‍🔧 <b>Barber:</b> ${booking.barber.name}${booking.barber.tg_username ? ` (@${booking.barber.tg_username})` : ''}

💈 <b>Xizmat:</b> ${booking.service.name}
💵 <b>Narxi:</b> ${Number(booking.service.price).toLocaleString()} so'm
⏱ <b>Davomiyligi:</b> ${booking.service.duration} daqiqa

📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${booking.time}

📌 <b>Status:</b> ${statusDisplay}
${booking.comment ? `\n💬 <b>Izoh:</b> ${booking.comment}\n` : ''}

`;
    });

    const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'menu_back');

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleTimeInput(
    ctx: Context,
    date: string,
    barberId: number,
    serviceIdsStr: string,
  ) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const barber = await this.userService.findOne(barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    const serviceIds = serviceIdsStr.split(',').map((id) => parseInt(id));

    this.bookingStates.set(ctx.from.id, {
      step: 'time_input',
      serviceIds,
      barberId,
      date,
    });

    const workTimeRange = barber.work_start_time && barber.work_end_time
      ? `${barber.work_start_time} - ${barber.work_end_time}`
      : '09:00 - 18:00';

    return ctx.reply(
      `Vaqtni kiriting (HH:mm formatida):\n\nMasalan: 14:30\n\nIltimos, barberning ish vaqti oralig'idagi vaqtni kiriting (${workTimeRange}).`,
    );
  }

  async handleCommentText(ctx: Context, commentText: string) {
    const userId = ctx.from?.id;
    if (!userId) return false;

    const state = this.bookingStates.get(userId);
    if (!state || state.step !== 'comment' || !state.bookingIds) return false;

    // Update all bookings with comment
    try {
      for (const bookingId of state.bookingIds) {
        await this.bookingService.updateComment(bookingId, commentText);
      }

      // Clear booking state
      this.bookingStates.delete(userId);

      const menu = getClientMainMenu();
      return ctx.reply(
        '✅ Izoh muvaffaqiyatli qo\'shildi!\n\nAsosiy menyuga qaytingiz.',
        { reply_markup: menu },
      );
    } catch (error) {
      console.error('Failed to update comment:', error);
      return ctx.reply(
        "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
      );
    }
  }

  /**
   * Set comment request state for a user
   */
  setCommentRequestState(userId: number, bookingIds: number[]): void {
    this.bookingStates.set(userId, {
      step: 'comment',
      bookingIds: bookingIds,
    });
  }

  async handleSkipComment(ctx: Context, bookingIds?: number[]) {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Agar bookingIds berilgan bo'lsa (comment request'dan kelgan), state'ni o'rnatish
    if (bookingIds && bookingIds.length > 0) {
      // State o'rnatilgan bo'lishi mumkin, lekin skip qilamiz, shuning uchun state'ni tozalaymiz
      this.bookingStates.delete(userId);
    } else {
      // Legacy: state'dan o'qish
      const state = this.bookingStates.get(userId);
      if (!state || state.step !== 'comment') return;
      // Clear booking state
      this.bookingStates.delete(userId);
    }

    const menu = getClientMainMenu();
    return ctx.reply(
      'Asosiy menyuga qaytingiz.',
      { reply_markup: menu },
    );
  }

  async handleTimeInputText(ctx: Context, timeText: string) {
    const userId = ctx.from?.id;
    if (!userId) return false;

    const state = this.bookingStates.get(userId);
    if (!state || state.step !== 'time_input' || !state.barberId) return false;

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeText)) {
      return ctx.reply(
        "Noto'g'ri vaqt formati. Iltimos, HH:mm formatida kiriting.\n\nMasalan: 14:30",
      );
    }

    const barber = await this.userService.findOne(state.barberId);
    if (!barber) {
      return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }

    const [hours, minutes] = timeText.split(':').map(Number);

    // Check if time is within barber's working hours
    const startHour = barber.work_start_time 
      ? parseInt(barber.work_start_time.split(':')[0])
      : 9;
    const endHour = barber.work_end_time
      ? parseInt(barber.work_end_time.split(':')[0])
      : 18;

    if (hours < startHour || hours >= endHour) {
      const workTimeRange = barber.work_start_time && barber.work_end_time
        ? `${barber.work_start_time} - ${barber.work_end_time}`
        : '09:00 - 18:00';
      return ctx.reply(
        `Vaqt barberning ish vaqti oralig'ida bo'lishi kerak (${workTimeRange}).`,
      );
    }

    // Use the stored state data
    const { serviceIds, date } = state;
    if (!serviceIds || !date) {
      return ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }

    // Call handleTimeSelection with the entered time
    await this.handleTimeSelection(ctx, date, timeText, state.barberId, serviceIds);
    return true;
  }

  isInBookingFlow(userId: number): boolean {
    return this.bookingStates.has(userId);
  }

  async handleBackToMenu(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    // Booking state'ni tozalash
    this.bookingStates.delete(ctx.from.id);

    // Check if user is admin or super admin
    const user = await this.userService.findByTgId(tgId);
    if (user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN)) {
      const menu = getAdminMainMenu();
      const roleName = user.role === UserRole.ADMIN ? 'Administrator (Admin)' : 'Super Administrator';
      const welcomeMessage = `
👋 <b>Xush kelibsiz, ${user.name || 'Foydalanuvchi'}!</b>

✅ <b>Sizning rolingiz: ${roleName}</b>

━━━━━━━━━━━━━━━━━━

📋 <b>Vazifangiz:</b>

Mijozlar bron yaratgan paytda sizga avtomatik xabar yuboriladi. Sizning vazifangiz:

✅ <b>Bronni tasdiqlash</b> - Mijozga tasdiqlash xabari yuboriladi
❌ <b>Bronni bekor qilish</b> - Mijozga rad etish xabari yuboriladi

━━━━━━━━━━━━━━━━━━

Quyidagi bo'limlardan birini tanlang:

`;

      // Xabarni tahrirlash yoki yangi xabar yuborish
      try {
        return await ctx.editMessageText(welcomeMessage, {
          reply_markup: menu,
          parse_mode: 'HTML',
        });
      } catch (error) {
        // Agar xabar tahrirlab bo'lmasa, yangi xabar yuborish
        return ctx.reply(welcomeMessage, {
          reply_markup: menu,
          parse_mode: 'HTML',
        });
      }
    }

    // Check if user is a barber
    const barber = await this.userService.findBarberByTgId(tgId);
    if (barber) {
      const menu = getBarberMainMenu();
      const welcomeMessage = `
👋 <b>Xush kelibsiz, ${barber.name}!</b>

💈 <i>Barber paneliga xush kelibsiz.</i>

Quyidagi bo'limlardan birini tanlang:

━━━━━━━━━━━━━━━━━━

`;

      // Xabarni tahrirlash yoki yangi xabar yuborish
      try {
        return await ctx.editMessageText(welcomeMessage, {
          reply_markup: menu,
          parse_mode: 'HTML',
        });
      } catch (error) {
        // Agar xabar tahrirlab bo'lmasa, yangi xabar yuborish
        return ctx.reply(welcomeMessage, {
          reply_markup: menu,
          parse_mode: 'HTML',
        });
      }
    }

    // Check if user is a client
    const client = await this.userService.findClientByTgId(tgId);
    if (!client) {
      return ctx.reply("Iltimos, avval ro'yxatdan o'ting: /start");
    }

    const menu = getClientMainMenu();
    const welcomeMessage = `Xush kelibsiz, ${client.name}! 👋\n\nXizmatlardan foydalanish uchun quyidagi tugmalardan birini tanlang:`;

    // Xabarni tahrirlash yoki yangi xabar yuborish
    try {
      return await ctx.editMessageText(welcomeMessage, {
        reply_markup: menu,
      });
    } catch (error) {
      // Agar xabar tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(welcomeMessage, { reply_markup: menu });
    }
  }

  async handleBackToServices(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.bookingStates.get(ctx.from.id);
    if (!state || !state.barberId) {
      return this.handleBookService(ctx);
    }

    // Barber va tanlangan xizmatlarni saqlab qolish
    const barberId = state.barberId;
    const serviceIds = state.serviceIds || [];

    const barber = await this.userService.findOne(barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    // Get all services
    const services = await this.barberServiceService.findAll();
    if (services.length === 0) {
      return ctx.reply("Hozircha mavjud xizmatlar yo'q.");
    }

    // Create inline keyboard for services (multiple selection)
    const keyboard = new InlineKeyboard();
    services.forEach((service) => {
      const isSelected = serviceIds.includes(service.id);
      keyboard
        .text(
          `${isSelected ? '🟩' : '⬜'} ${service.name} — ${service.price} so'm (${service.duration} min)`,
          `service_toggle_${service.id}`,
        )
        .row();
    });
    keyboard
      .text('⬅️ Ortga qaytish', 'back_to_barbers')
      .text('✅ Davom etish', 'service_continue')
      .row();

    // State'ni yangilash
    this.bookingStates.set(ctx.from.id, {
      step: 'service',
      barberId,
      serviceIds,
    });

    const selectedCount = serviceIds.length;
    const workTime = barber.work_start_time && barber.work_end_time
      ? `\n🕒 <b>Ish vaqti:</b> ${barber.work_start_time} - ${barber.work_end_time}`
      : '';

    const message = `
<b>💈 Barber:</b> ${barber.name}${workTime}

━━━━━━━━━━━━━━━━━━

<b>✂️ Xizmatlarni tanlang</b>

<i>(bir nechta tanlash mumkin)</i>

📌 <b>Tanlangan xizmatlar:</b> ${selectedCount}

━━━━━━━━━━━━━━━━━━
`;

    // Xabarni tahrirlash yoki yangi xabar yuborish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabar tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleBackToBarbers(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const client = await this.userService.findClientByTgId(tgId);
    if (!client) {
      return ctx.reply("Iltimos, avval ro'yxatdan o'ting: /start");
    }

    // Get working barbers
    const barbers = await this.userService.findWorkingBarbers();
    if (barbers.length === 0) {
      return ctx.reply(
        "Hozircha ishlayotgan barberlar yo'q. Iltimos, keyinroq urinib ko'ring.",
      );
    }

    // Create inline keyboard for barbers
    const keyboard = new InlineKeyboard();
    barbers.forEach((barber) => {
      const workTime = barber.work_start_time && barber.work_end_time
        ? ` (${barber.work_start_time} - ${barber.work_end_time})`
        : '';
      const usernameDisplay = barber.tg_username ? ` (@${barber.tg_username})` : '';
      keyboard
        .text(
          `👤 ${barber.name}${usernameDisplay}${workTime}`,
          `barber_select_${barber.id}`,
        )
        .row();
    });
    keyboard.text('⬅️ Ortga qaytish', 'menu_back').row();

    this.bookingStates.set(ctx.from.id, { step: 'barber' });

    const message = `
<b>💈 Barberni tanlang</b>

Iltimos, xizmat olish uchun barberni tanlang:

━━━━━━━━━━━━━━━━━━
`;

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleBackToDate(ctx: Context, barberId: number, serviceIdsStr: string) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const serviceIds = serviceIdsStr.split(',').map((id) => parseInt(id));

    const client = await this.userService.findClientByTgId(tgId);
    if (!client) return;

    const barber = await this.userService.findOne(barberId);
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

    // Calculate totals
    const totalPrice = selectedServices.reduce(
      (sum, s) => sum + Number(s.price),
      0,
    );
    const totalDuration = selectedServices.reduce(
      (sum, s) => sum + s.duration,
      0,
    );

    // Format services list
    const servicesList = selectedServices
      .map((s) => `✂️ ${s.name} — ${s.price} so'm (${s.duration} min)`)
      .join('\n');

    const workTime = barber.work_start_time && barber.work_end_time
      ? `\n🕒 <b>Ish vaqti:</b> ${barber.work_start_time} - ${barber.work_end_time}`
      : '';

    // Premium card message
    const message = `
<b>💈 Barber:</b> ${barber.name}${workTime}

<b>🧾 Tanlangan xizmatlar</b>

━━━━━━━━━━━━━━━━━━
${servicesList}
━━━━━━━━━━━━━━━━━━

💰 <b>Jami narx:</b> ${totalPrice} so'm
⏱ <b>Jami vaqt:</b> ${totalDuration} daqiqa

📅 <b>Sana tanlang:</b>
`;

    // Generate available time slots for today and next 7 days
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]); // yyyy-mm-dd
    }

    // Create premium inline keyboard for dates (2 columns)
    const keyboard = new InlineKeyboard();
    dates.forEach((date, index) => {
      const dateObj = new Date(date + 'T00:00:00'); // Timezone muammosini hal qilish
      const weekday = dateObj.toLocaleDateString('uz-UZ', {
        weekday: 'short',
      });
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString('uz-UZ', {
        month: 'short',
      });
      const dateDisplay = `📅 ${weekday} • ${day}-${month}`;
      
      // Har ikkinchi tugmadan keyin yangi qator
      if (index % 2 === 0) {
        keyboard.text(
          dateDisplay,
          `date_${date}_${barberId}_${serviceIds.join(',')}`,
        );
      } else {
        keyboard
          .text(
            dateDisplay,
            `date_${date}_${barberId}_${serviceIds.join(',')}`,
          )
          .row();
      }
    });
    
    // Agar tugmalar soni toq bo'lsa, oxirgi qatorni yopish
    if (dates.length % 2 !== 0) {
      keyboard.row();
    }
    keyboard.text('⬅️ Ortga qaytish', 'back_to_services').row();

    this.bookingStates.set(ctx.from.id, {
      step: 'date',
      serviceIds,
      barberId,
    });

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }
}
