import { Context, InlineKeyboard } from 'grammy';
import { UserService } from '../../user/user.service';
import { User } from '../../user/entities/user.entity';
import { BarberServiceService } from '../../barber-service/barber-service.service';
import { BarberService as BarberServiceEntity } from '../../barber-service/entities/barber-service.entity';
import { BookingService } from '../../booking/booking.service';
import { ServiceCategoryService } from '../../service-category/service-category.service';
import { getBarberReplyMenu } from '../keyboards/main.menu';
import { BookingStatus } from '../../../common/enums/booking-status.enum';
import { UserRole } from '../../../common/enums/user.enum';

type BarberBookingState = {
  step:
    | 'client_search'
    | 'client_search_phone'
    | 'client_search_username'
    | 'client_info'
    | 'client_info_name'
    | 'client_info_phone'
    | 'client_info_username'
    | 'service'
    | 'date'
    | 'time'
    | 'confirm';
  barberId?: number;
  clientId?: number;
  clientPhone?: string;
  clientUsername?: string;
  clientName?: string;
  selectedServiceIds?: number[];
  currentCategoryId?: number;
  currentPage?: number;
  date?: string;
  time?: string;
};

export class BarberMenuHandler {
  public barberBookingStates = new Map<number, BarberBookingState>();

  constructor(
    private userService: UserService,
    private barberServiceService: BarberServiceService,
    private bookingService: BookingService,
    private serviceCategoryService: ServiceCategoryService,
  ) {}

  async handleStartShift(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const barber = await this.userService.findBarberByTgId(tgId);
    if (!barber) {
      return ctx.reply('Siz barber emassiz.');
    }

    if (barber.working) {
      return ctx.reply('Siz allaqachon ishlayapsiz.');
    }

    await this.userService.updateWorkingStatus(barber.id, true);

    return ctx.reply(
      '✅ Ish boshlandi! Endi sizga bookinglar qabul qilinadi.',
    );
  }

  async handleEndShift(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const barber = await this.userService.findBarberByTgId(tgId);
    if (!barber) {
      return ctx.reply('Siz barber emassiz.');
    }

    if (!barber.working) {
      return ctx.reply('Siz hozir ishlamayapsiz.');
    }

    await this.userService.updateWorkingStatus(barber.id, false);

    return ctx.reply(
      '⏹ Ish yakunlandi. Yana ishga qaytganda "Ishni boshlash" tugmasini bosing.',
    );
  }

  async handleMyBookings(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const barber = await this.userService.findBarberByTgId(tgId);
    if (!barber) {
      return ctx.reply('Siz barber emassiz.');
    }

    const bookings = await this.bookingService.findByBarberId(barber.id);

    if (bookings.length === 0) {
      return ctx.reply('Sizda hozircha bookinglar yo\'q.');
    }

    // Get today's date in yyyy-mm-dd format (Uzbekistan timezone)
    const now = new Date();
    const uzbekistanTime = new Date(
      now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }),
    );
    const today = uzbekistanTime.toISOString().split('T')[0];

    // Group bookings by date
    const bookingsByDate = new Map<string, typeof bookings>();
    bookings.forEach((booking) => {
      if (!bookingsByDate.has(booking.date)) {
        bookingsByDate.set(booking.date, []);
      }
      bookingsByDate.get(booking.date)!.push(booking);
    });

    // Sort dates
    const sortedDates = Array.from(bookingsByDate.keys()).sort();

    let message = '📋 Sizning bookinglaringiz\n\n';

    sortedDates.forEach((date, dateIndex) => {
      // Date header
      const isToday = date === today;
      message += '══════════════════════\n';
      message += `📅 ${date}${isToday ? ' (Bugun)' : ''}\n\n`;

      const dateBookings = bookingsByDate.get(date)!;

      // Group bookings by client (same client_id, barber_id, date, time)
      const clientGroups = new Map<string, typeof dateBookings>();
      dateBookings.forEach((booking) => {
        const key = `${booking.client_id}_${booking.barber_id}_${booking.date}_${booking.time}`;
        if (!clientGroups.has(key)) {
          clientGroups.set(key, []);
        }
        clientGroups.get(key)!.push(booking);
      });

      // Process each client group
      const clientGroupArray = Array.from(clientGroups.values());
      clientGroupArray.forEach((clientBookings, clientIndex) => {
        const firstBooking = clientBookings[0];
        const client = firstBooking.client;

        if (client) {
          // Client info
          message += `👤 Mijoz: ${client.name || "Noma'lum"}\n`;
          message += `📞 Telefon: ${client.phone_number || "Yo'q"}\n\n`;
        }

        // Services for this client group
        clientBookings.forEach((booking, serviceIndex) => {
          const service = booking.service;
          const serviceName = service?.name || "Noma'lum xizmat";
          const servicePrice = service?.price || 0;
          const statusText = this.bookingService.getStatusDisplayInUzbek(
            booking.status,
          );

          // Get service emoji
          const getServiceEmoji = (name: string): string => {
            const lowerName = name.toLowerCase();
            if (lowerName.includes('soch olish')) return '✂️';
            if (lowerName.includes('soqol') && lowerName.includes('tekislash')) return '💈';
            if (lowerName.includes('soqol olish')) return '🧔';
            if (lowerName.includes('soch bo\'yash') || lowerName.includes('soch boyash')) return '🎨';
            return '💈';
          };

          // Format time range
          const startTime = booking.time;
          let endTimeStr = '';
          if (booking.end_time) {
            const endTime = new Date(booking.end_time);
            endTimeStr = endTime.toLocaleTimeString('uz-UZ', {
              hour: '2-digit',
              minute: '2-digit',
            });
          } else if (service?.duration) {
            // Calculate end time if not available
            const [hours, minutes] = startTime.split(':').map(Number);
            const startDate = new Date(`${booking.date}T${startTime}:00`);
            const endDate = new Date(
              startDate.getTime() + service.duration * 60 * 1000,
            );
            endTimeStr = endDate.toLocaleTimeString('uz-UZ', {
              hour: '2-digit',
              minute: '2-digit',
            });
          }

          // Get time emoji based on hour
          const getTimeEmoji = (timeStr: string): string => {
            const [hours] = timeStr.split(':').map(Number);
            if (hours >= 6 && hours < 12) return '🕘'; // Morning
            if (hours >= 12 && hours < 18) return '🕓'; // Afternoon
            if (hours >= 18 && hours < 22) return '🕕'; // Evening
            return '🕐'; // Night/Early morning
          };
          const timeEmoji = getTimeEmoji(startTime);

          // Format price with spaces (e.g., 50000 -> "50 000")
          const formattedPrice = Number(servicePrice)
            .toLocaleString('uz-UZ')
            .replace(/,/g, ' ');

          // Number emoji (1️⃣, 2️⃣, etc.)
          const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
          const numberEmoji = numberEmojis[serviceIndex] || `${serviceIndex + 1}.`;

          message += `${numberEmoji} ${getServiceEmoji(serviceName)} ${serviceName}\n`;
          if (endTimeStr) {
            message += `${timeEmoji} ${startTime} — ${endTimeStr}\n`;
          } else {
            message += `${timeEmoji} ${startTime}\n`;
          }
          message += `💰 ${formattedPrice} so'm\n`;
          message += `${statusText}\n\n`;
        });

        // Separator between different client bookings on the same day
        if (clientIndex < clientGroupArray.length - 1) {
          message += '──────────────────────\n\n';
        }
      });

      // Close date section
      if (dateIndex < sortedDates.length - 1) {
        message += '\n';
      }
    });

    message += '══════════════════════';

    return ctx.reply(message, { parse_mode: 'HTML' });
  }

  async handleMyServices(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const barber = await this.userService.findBarberByTgId(tgId);
    if (!barber) {
      return ctx.reply('Siz barber emassiz.');
    }

    // Get all available services (common for all barbers)
    const services = await this.barberServiceService.findAll();
    if (services.length === 0) {
      return ctx.reply('Hozircha mavjud xizmatlar yo\'q.');
    }

    // Emoji mapping fallback
    const getServiceEmoji = (serviceName: string): string => {
      const name = serviceName.toLowerCase();
      if (name.includes('soch olish')) {
        return '✂️';
      }
      if (name.includes('soqol olish')) {
        return '🧔';
      }
      if (name.includes('soch bo\'yash') || name.includes('soch boyash')) {
        return '🎨';
      }
      return '💈'; // Default emoji
    };

    const servicesMessage = `
🛠 <b>Mavjud xizmatlar</b>

━━━━━━━━━━━━━━━━━━

${services.map((s, i) => `
<b>${i+1}) ${getServiceEmoji(s.name)} ${s.name}</b>

💵 <i>Narx:</i> ${s.price} so'm

⏱ <i>Davomiyligi:</i> ${s.duration} daqiqa  

`).join("\n")}

━━━━━━━━━━━━━━━━━━

`;

    const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'menu_back');

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(servicesMessage, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(servicesMessage, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleMyProfile(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const barber = await this.userService.findBarberByTgId(tgId);
    if (!barber) {
      return ctx.reply('Siz barber emassiz.');
    }

    const profileMessage = `
<b>ℹ️ Sizning profilingiz:</b>

──────────────
👤 <b>Ism:</b> ${barber.name}
💬 <b>Telegram:</b> ${barber.tg_username ? `@${barber.tg_username}` : 'Yo\'q'}
⚡ <b>Holat:</b> ${barber.working ? 'Ishlayapti ✅' : 'Ishlamayapti ❌'}
📅 <b>Ro'yxatdan o'tgan sana:</b> ${barber.created_at.toLocaleDateString('uz-UZ')}
──────────────
`;

    const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'menu_back');

    // Eski xabarni yangi xabar bilan almashtirish
    try {
      return await ctx.editMessageText(profileMessage, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      // Agar xabarni tahrirlab bo'lmasa, yangi xabar yuborish
      return ctx.reply(profileMessage, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleManageBookings(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const barber = await this.userService.findBarberByTgId(tgId);
    if (!barber) {
      return ctx.reply('Siz barber emassiz.');
    }

    // Barberning PENDING va APPROVED bookinglarini sanash
    const pendingBookings = await this.bookingService.findPendingBookingsByBarberId(barber.id);
    const approvedBookings = await this.bookingService.findApprovedBookingsByBarberId(barber.id);

    const pendingCount = pendingBookings.length;
    const approvedCount = approvedBookings.length;

    const message = `<b>📋 Bookinglarni boshqarish</b>

━━━━━━━━━━━━━━━━━━

📊 <b>Statistika:</b>
🟡 Kutilayotgan bookinglar: <b>${pendingCount} ta</b>
🟢 Tasdiqlangan bookinglar: <b>${approvedCount} ta</b>

━━━━━━━━━━━━━━━━━━

Quyidagi tugmalardan birini tanlang:`;

    const keyboard = new InlineKeyboard();
    
    if (pendingCount > 0) {
      keyboard.text(`🟡 Kutilayotgan bookinglar (${pendingCount} ta)`, `barber_pending_bookings_page_1`).row();
    }
    
    if (approvedCount > 0) {
      keyboard.text(`🟢 Tasdiqlangan bookinglar (${approvedCount} ta)`, `barber_approved_bookings_page_1`).row();
    }
    
    keyboard.text('⬅️ Ortga qaytish', 'menu_back');

    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handlePendingBookings(ctx: Context, page: number = 1) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const barber = await this.userService.findBarberByTgId(tgId);
    if (!barber) {
      return ctx.reply('Siz barber emassiz.');
    }

    const allBookings = await this.bookingService.findPendingBookingsByBarberId(barber.id);

    if (allBookings.length === 0) {
      const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'barber_manage_bookings');
      const message = "🟡 Kutilayotgan bookinglar yo'q.";
      
      try {
        return await ctx.editMessageText(message, {
          reply_markup: keyboard,
          parse_mode: 'HTML',
        });
      } catch (error) {
        return ctx.reply(message, {
          reply_markup: keyboard,
          parse_mode: 'HTML',
        });
      }
    }

    // Group bookings by client (same client_id, barber_id, date, time)
    const groupedBookings = new Map<string, typeof allBookings>();
    allBookings.forEach((booking) => {
      const key = `${booking.client_id}_${booking.barber_id}_${booking.date}_${booking.time}`;
      if (!groupedBookings.has(key)) {
        groupedBookings.set(key, []);
      }
      groupedBookings.get(key)!.push(booking);
    });

    const groupedArray = Array.from(groupedBookings.values());
    const totalPages = groupedArray.length;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const currentBookingGroup = groupedArray[currentPage - 1];

    if (!currentBookingGroup || currentBookingGroup.length === 0) {
      const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'barber_manage_bookings');
      return ctx.reply('Booking topilmadi.', { reply_markup: keyboard });
    }

    const firstBooking = currentBookingGroup[0];
    const client = firstBooking.client;
    const services = currentBookingGroup.map((b) => b.service).filter((s) => s !== null);

    const totalPrice = services.reduce((sum, s) => sum + Number(s?.price || 0), 0);
    const totalDuration = services.reduce((sum, s) => sum + Number(s?.duration || 0), 0);

    // Format date
    const dateObj = new Date(firstBooking.date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('uz-UZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Format time range
    const startTime = firstBooking.time;
    let endTimeStr = '';
    if (firstBooking.end_time) {
      const endTime = new Date(firstBooking.end_time);
      endTimeStr = endTime.toLocaleTimeString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (services[0]?.duration) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date(`${firstBooking.date}T${startTime}:00`);
      const endDate = new Date(
        startDate.getTime() + totalDuration * 60 * 1000,
      );
      endTimeStr = endDate.toLocaleTimeString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    const statusText = this.bookingService.getStatusDisplayInUzbek(firstBooking.status);

    const message = `<b>🟡 Kutilayotgan booking #${currentPage}</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Mijoz:</b> ${client?.name || "Noma'lum"}
📞 <b>Telefon:</b> ${client?.phone_number || "Yo'q"}
${client?.tg_username ? `💬 <b>Telegram:</b> @${client.tg_username}\n` : ''}
💈 <b>Xizmatlar:</b>
${services.map((s) => `• ${s?.name || "Noma'lum"} – ${Number(s?.price || 0).toLocaleString()} so'm (${s?.duration || 0} daqiqa)`).join('\n')}

💵 <b>Jami:</b> ${totalPrice.toLocaleString()} so'm, ${totalDuration} daqiqa
📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${startTime}${endTimeStr ? ` — ${endTimeStr}` : ''}
📋 <b>Status:</b> ${statusText}

━━━━━━━━━━━━━━━━━━

📄 <b>Sahifa:</b> ${currentPage}/${totalPages}`;

    const keyboard = new InlineKeyboard();
    
    // Status o'zgartirish tugmalari
    keyboard
      .text('✅ Tasdiqlash', `barber_approve_booking_${firstBooking.id}`)
      .text('❌ Bekor qilish', `barber_reject_booking_${firstBooking.id}`)
      .row();

    // Pagination tugmalari
    if (totalPages > 1) {
      if (currentPage > 1) {
        keyboard.text('⬅️ Oldingi', `barber_pending_bookings_page_${currentPage - 1}`);
      }
      if (currentPage < totalPages) {
        keyboard.text('Keyingi ➡️', `barber_pending_bookings_page_${currentPage + 1}`);
      }
      keyboard.row();
    }

    keyboard.text('⬅️ Ortga qaytish', 'barber_manage_bookings');

    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleApprovedBookings(ctx: Context, page: number = 1) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const barber = await this.userService.findBarberByTgId(tgId);
    if (!barber) {
      return ctx.reply('Siz barber emassiz.');
    }

    const allBookings = await this.bookingService.findApprovedBookingsByBarberId(barber.id);

    if (allBookings.length === 0) {
      const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'barber_manage_bookings');
      const message = "🟢 Tasdiqlangan bookinglar yo'q.";
      
      try {
        return await ctx.editMessageText(message, {
          reply_markup: keyboard,
          parse_mode: 'HTML',
        });
      } catch (error) {
        return ctx.reply(message, {
          reply_markup: keyboard,
          parse_mode: 'HTML',
        });
      }
    }

    // Group bookings by client (same client_id, barber_id, date, time)
    const groupedBookings = new Map<string, typeof allBookings>();
    allBookings.forEach((booking) => {
      const key = `${booking.client_id}_${booking.barber_id}_${booking.date}_${booking.time}`;
      if (!groupedBookings.has(key)) {
        groupedBookings.set(key, []);
      }
      groupedBookings.get(key)!.push(booking);
    });

    const groupedArray = Array.from(groupedBookings.values());
    const totalPages = groupedArray.length;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const currentBookingGroup = groupedArray[currentPage - 1];

    if (!currentBookingGroup || currentBookingGroup.length === 0) {
      const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'barber_manage_bookings');
      return ctx.reply('Booking topilmadi.', { reply_markup: keyboard });
    }

    const firstBooking = currentBookingGroup[0];
    const client = firstBooking.client;
    const services = currentBookingGroup.map((b) => b.service).filter((s) => s !== null);

    const totalPrice = services.reduce((sum, s) => sum + Number(s?.price || 0), 0);
    const totalDuration = services.reduce((sum, s) => sum + Number(s?.duration || 0), 0);

    // Format date
    const dateObj = new Date(firstBooking.date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('uz-UZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Format time range
    const startTime = firstBooking.time;
    let endTimeStr = '';
    if (firstBooking.end_time) {
      const endTime = new Date(firstBooking.end_time);
      endTimeStr = endTime.toLocaleTimeString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (services[0]?.duration) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date(`${firstBooking.date}T${startTime}:00`);
      const endDate = new Date(
        startDate.getTime() + totalDuration * 60 * 1000,
      );
      endTimeStr = endDate.toLocaleTimeString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    const statusText = this.bookingService.getStatusDisplayInUzbek(firstBooking.status);

    const message = `<b>🟢 Tasdiqlangan booking #${currentPage}</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Mijoz:</b> ${client?.name || "Noma'lum"}
📞 <b>Telefon:</b> ${client?.phone_number || "Yo'q"}
${client?.tg_username ? `💬 <b>Telegram:</b> @${client.tg_username}\n` : ''}
💈 <b>Xizmatlar:</b>
${services.map((s) => `• ${s?.name || "Noma'lum"} – ${Number(s?.price || 0).toLocaleString()} so'm (${s?.duration || 0} daqiqa)`).join('\n')}

💵 <b>Jami:</b> ${totalPrice.toLocaleString()} so'm, ${totalDuration} daqiqa
📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${startTime}${endTimeStr ? ` — ${endTimeStr}` : ''}
📋 <b>Status:</b> ${statusText}

━━━━━━━━━━━━━━━━━━

📄 <b>Sahifa:</b> ${currentPage}/${totalPages}`;

    const keyboard = new InlineKeyboard();
    
    // Status o'zgartirish tugmalari
    keyboard
      .text('✅ Yakunlash', `barber_complete_booking_${firstBooking.id}`)
      .text('❌ Bekor qilish', `barber_cancel_booking_${firstBooking.id}`)
      .row();

    // Pagination tugmalari
    if (totalPages > 1) {
      if (currentPage > 1) {
        keyboard.text('⬅️ Oldingi', `barber_approved_bookings_page_${currentPage - 1}`);
      }
      if (currentPage < totalPages) {
        keyboard.text('Keyingi ➡️', `barber_approved_bookings_page_${currentPage + 1}`);
      }
      keyboard.row();
    }

    keyboard.text('⬅️ Ortga qaytish', 'barber_manage_bookings');

    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleCreateClientBooking(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const barber = await this.userService.findBarberByTgId(tgId);
    if (!barber) {
      return ctx.reply('Siz barber emassiz.');
    }

    // State'ni boshlash
    this.barberBookingStates.set(ctx.from.id, {
      step: 'client_search',
      barberId: barber.id,
    });

    const message = `<b>👤 Mijoz uchun bron yaratish</b>

━━━━━━━━━━━━━━━━━━

Mijozni qanday qidirmoqchisiz?`;

    const keyboard = new InlineKeyboard();
    keyboard
      .text('📞 Telefon raqam orqali qidirish', 'barber_search_client_phone')
      .row()
      .text('💬 Username orqali qidirish', 'barber_search_client_username')
      .row()
      .text('⬅️ Ortga qaytish', 'menu_back');

    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleClientSearchByPhone(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.barberBookingStates.get(ctx.from.id);
    if (!state) return;

    // State'ni yangilash
    this.barberBookingStates.set(ctx.from.id, {
      ...state,
      step: 'client_search_phone',
    });

    const message = `<b>📞 Telefon raqam orqali qidirish</b>

━━━━━━━━━━━━━━━━━━

Iltimos, mijozning telefon raqamini kiriting:
(Masalan: +998901234567 yoki 998901234567)`;

    const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'barber_create_client_booking');

    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleClientSearchByUsername(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.barberBookingStates.get(ctx.from.id);
    if (!state) return;

    // State'ni yangilash
    this.barberBookingStates.set(ctx.from.id, {
      ...state,
      step: 'client_search_username',
    });

    const message = `<b>💬 Username orqali qidirish</b>

━━━━━━━━━━━━━━━━━━

Iltimos, mijozning Telegram username'ini kiriting:
(Masalan: @username yoki username)`;

    const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'barber_create_client_booking');

    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleClientSearchInput(ctx: Context, input: string) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.barberBookingStates.get(ctx.from.id);
    if (!state) return;

    let client: User | null = null;
    let searchType = '';

    if (state.step === 'client_search_phone') {
      // Telefon raqam orqali qidirish
      searchType = 'phone';
      const phoneNumber = input.trim().replace(/\s+/g, '');
      client = await this.userService.findByPhoneNumber(phoneNumber);
      
      if (client) {
        this.barberBookingStates.set(ctx.from.id, {
          ...state,
          step: 'client_info',
          clientId: client.id,
          clientPhone: client.phone_number || phoneNumber,
          clientUsername: client.tg_username,
          clientName: client.name,
        });
      } else {
        this.barberBookingStates.set(ctx.from.id, {
          ...state,
          step: 'client_info',
          clientPhone: phoneNumber,
        });
      }
    } else if (state.step === 'client_search_username') {
      // Username orqali qidirish
      searchType = 'username';
      const username = input.trim().replace('@', '');
      client = await this.userService.findByTgUsername(username);
      
      if (client) {
        this.barberBookingStates.set(ctx.from.id, {
          ...state,
          step: 'client_info',
          clientId: client.id,
          clientPhone: client.phone_number,
          clientUsername: client.tg_username || username,
          clientName: client.name,
        });
      } else {
        this.barberBookingStates.set(ctx.from.id, {
          ...state,
          step: 'client_info',
          clientUsername: username,
        });
      }
    }

    if (client) {
      // Mijoz topildi
      const message = `<b>✅ Mijoz topildi</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Ism:</b> ${client.name || "Noma'lum"}
📞 <b>Telefon:</b> ${client.phone_number || "Yo'q"}
${client.tg_username ? `💬 <b>Telegram:</b> @${client.tg_username}\n` : ''}
${client.tg_id ? `🆔 <b>Telegram ID:</b> ${client.tg_id}\n` : ''}

Bu mijozni tanlashni tasdiqlaysizmi?`;

      const keyboard = new InlineKeyboard();
      keyboard
        .text('✅ Bu mijozni tanlash', `barber_select_client_${client.id}`)
        .row()
        .text('⬅️ Ortga qaytish', 'barber_create_client_booking');

      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } else {
      // Mijoz topilmadi, yangi mijoz yaratish - ism so'rash
      // State'ni yangilash
      this.barberBookingStates.set(ctx.from.id, {
        ...state,
        step: 'client_info_name',
        clientPhone: searchType === 'phone' ? input.trim().replace(/\s+/g, '') : undefined,
        clientUsername: searchType === 'username' ? input.trim().replace('@', '') : undefined,
      });

      const message = `<b>❌ Mijoz topilmadi</b>

━━━━━━━━━━━━━━━━━━

Bu ${searchType === 'phone' ? 'telefon raqam' : 'username'} bilan mijoz topilmadi.

Yangi mijoz yaratish uchun mijozning <b>ismini</b> kiriting:`;

      const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'barber_create_client_booking');

      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleClientInfoInput(ctx: Context, input: string) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.barberBookingStates.get(ctx.from.id);
    if (!state) return;

    // Ism so'rash bosqichi
    if (state.step === 'client_info_name') {
      const trimmedName = input.trim();
      if (!trimmedName) {
        return ctx.reply('Iltimos, mijozning ismini kiriting.');
      }

      // Ismni saqlash va telefon raqam so'rashga o'tish
      this.barberBookingStates.set(ctx.from.id, {
        ...state,
        step: 'client_info_phone',
        clientName: trimmedName,
      });

      const message = `<b>✅ Ism saqlandi: ${trimmedName}</b>

━━━━━━━━━━━━━━━━━━

Mijozning <b>telefon raqamini</b> kiriting (ixtiyoriy):
(Masalan: +998901234567 yoki 998901234567)

Agar telefon raqam bo'lmasa, "O'tkazib yuborish" tugmasini bosing.`;

      const keyboard = new InlineKeyboard();
      keyboard
        .text('⏭️ O\'tkazib yuborish', 'barber_skip_phone')
        .row()
        .text('⬅️ Ortga qaytish', 'barber_create_client_booking');

      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }

    // Telefon raqam so'rash bosqichi
    if (state.step === 'client_info_phone') {
      const trimmedPhone = input.trim().replace(/\s+/g, '');
      
      // Telefon raqamni saqlash va username so'rashga o'tish
      this.barberBookingStates.set(ctx.from.id, {
        ...state,
        step: 'client_info_username',
        clientPhone: trimmedPhone || state.clientPhone,
      });

      const phoneInfo = trimmedPhone ? `✅ Telefon raqam saqlandi: ${trimmedPhone}` : '⏭️ Telefon raqam o\'tkazib yuborildi';

      const message = `<b>${phoneInfo}</b>

━━━━━━━━━━━━━━━━━━

Mijozning <b>Telegram username</b>'ini kiriting (ixtiyoriy):
(Masalan: @username yoki username)

Agar username bo'lmasa, "O'tkazib yuborish" tugmasini bosing.`;

      const keyboard = new InlineKeyboard();
      keyboard
        .text('⏭️ O\'tkazib yuborish', 'barber_skip_username')
        .row()
        .text('⬅️ Ortga qaytish', 'barber_create_client_booking');

      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }

    // Username so'rash bosqichi
    if (state.step === 'client_info_username') {
      const trimmedUsername = input.trim().replace('@', '');
      
      // Username'ni saqlash va xizmatlarni tanlashga o'tish
      this.barberBookingStates.set(ctx.from.id, {
        ...state,
        step: 'service',
        clientUsername: trimmedUsername || state.clientUsername,
      });

      // Xizmatlarni tanlash bosqichini boshlash
      return this.handleServiceSelectionStart(ctx);
    }
  }

  async handleSkipPhone(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.barberBookingStates.get(ctx.from.id);
    if (!state || state.step !== 'client_info_phone') return;

    // Telefon raqamni o'tkazib yuborish va username so'rashga o'tish
    this.barberBookingStates.set(ctx.from.id, {
      ...state,
      step: 'client_info_username',
    });

    const message = `<b>⏭️ Telefon raqam o'tkazib yuborildi</b>

━━━━━━━━━━━━━━━━━━

Mijozning <b>Telegram username</b>'ini kiriting (ixtiyoriy):
(Masalan: @username yoki username)

Agar username bo'lmasa, "O'tkazib yuborish" tugmasini bosing.`;

    const keyboard = new InlineKeyboard();
    keyboard
      .text('⏭️ O\'tkazib yuborish', 'barber_skip_username')
      .row()
      .text('⬅️ Ortga qaytish', 'barber_create_client_booking');

    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleSkipUsername(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.barberBookingStates.get(ctx.from.id);
    if (!state || state.step !== 'client_info_username') return;

    // Username'ni o'tkazib yuborish va xizmatlarni tanlashga o'tish
    this.barberBookingStates.set(ctx.from.id, {
      ...state,
      step: 'service',
    });

    // Xizmatlarni tanlash bosqichini boshlash
    return this.handleServiceSelectionStart(ctx);
  }

  async handleSelectClient(ctx: Context, clientId: number) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.barberBookingStates.get(ctx.from.id);
    if (!state) return;

    const client = await this.userService.findOne(clientId);
    if (!client) {
      return ctx.reply('Mijoz topilmadi.');
    }

    // State'ni yangilash
    this.barberBookingStates.set(ctx.from.id, {
      ...state,
      step: 'client_info',
      clientId: client.id,
      clientPhone: client.phone_number,
      clientUsername: client.tg_username,
      clientName: client.name,
    });

    // Xizmatlarni tanlash bosqichini boshlash
    return this.handleServiceSelectionStart(ctx);
  }

  async handleServiceSelectionStart(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.barberBookingStates.get(ctx.from.id);
    if (!state || !state.barberId) return;

    const barber = await this.userService.findOne(state.barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    // Get all categories
    const categories = await this.serviceCategoryService.findAll();
    if (categories.length === 0) {
      return ctx.reply("Hozircha mavjud kategoriyalar yo'q.");
    }

    // Create inline keyboard for categories
    const keyboard = new InlineKeyboard();
    categories.forEach((category) => {
      keyboard
        .text(
          `${category.icon || '📁'} ${category.name}`,
          `barber_category_select_${category.id}`,
        )
        .row();
    });
    keyboard.text('⬅️ Ortga qaytish', 'barber_create_client_booking').row();

    this.barberBookingStates.set(ctx.from.id, {
      ...state,
      step: 'service',
      selectedServiceIds: [],
    });

    const workTime =
      barber.work_start_time && barber.work_end_time
        ? `\n🕒 <b>Ish vaqti:</b> ${barber.work_start_time} - ${barber.work_end_time}`
        : '';

    const message = `
<b>💈 Barber:</b> ${barber.name}${workTime}

━━━━━━━━━━━━━━━━━━

<b>📂 Xizmat kategoriyasini tanlang</b>

━━━━━━━━━━━━━━━━━━
`;

    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleCategorySelect(ctx: Context, categoryId: number, page: number = 1) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.barberBookingStates.get(ctx.from.id);
    if (!state || !state.barberId) return;

    const barber = await this.userService.findOne(state.barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    // Get services by category
    const allServices = await this.barberServiceService.findByCategory(categoryId);
    if (allServices.length === 0) {
      return ctx.reply(
        "Bu kategoriyada xizmatlar yo'q. Iltimos, boshqa kategoriya tanlang.",
      );
    }

    // Get current state to preserve selected services
    const selectedServiceIds = state.selectedServiceIds || [];

    // Pagination settings
    const itemsPerPage = 5;
    const totalPages = Math.ceil(allServices.length / itemsPerPage);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const services = allServices.slice(startIndex, endIndex);

    // Create inline keyboard for services
    const keyboard = new InlineKeyboard();
    services.forEach((service) => {
      const isSelected = selectedServiceIds.includes(service.id);
      keyboard
        .text(
          `${isSelected ? '✅' : '⬜'} ${service.name} (${service.duration} min)`,
          `barber_service_toggle_${service.id}_${categoryId}`,
        )
        .row();
    });

    // Pagination buttons
    if (totalPages > 1) {
      const paginationRow: Array<{ text: string; callback_data: string }> = [];
      if (currentPage > 1) {
        paginationRow.push({
          text: '⬅️',
          callback_data: `barber_category_page_${categoryId}_${currentPage - 1}`,
        });
      }
      if (currentPage < totalPages) {
        paginationRow.push({
          text: '➡️',
          callback_data: `barber_category_page_${categoryId}_${currentPage + 1}`,
        });
      }
      if (paginationRow.length > 0) {
        keyboard.row(...paginationRow);
      }
    }

    // Action buttons
    keyboard
      .row()
      .text('📂 Yana kategoriya qo\'shish', 'barber_add_more_categories')
      .row()
      .text('✅ Davom etish', 'barber_service_continue')
      .row();

    // Update state
    this.barberBookingStates.set(ctx.from.id, {
      ...state,
      currentCategoryId: categoryId,
      currentPage: currentPage,
    });

    const category = allServices[0]?.category;
    const categoryName = category
      ? `${category.icon || '📁'} ${category.name}`
      : 'Xizmatlar';

    const selectedCount = selectedServiceIds.length;
    const selectedInCategory = selectedServiceIds.filter((id) =>
      allServices.some((s) => s.id === id),
    ).length;

    const message = `
<b>💈 Barber:</b> ${barber.name}

<b>📂 Kategoriya:</b> ${categoryName}

━━━━━━━━━━━━━━━━━━

<b>✂️ Xizmatlarni tanlang</b>

<i>(bir nechta tanlash mumkin)</i>

📌 <b>Bu kategoriyadan tanlangan:</b> ${selectedInCategory}
🎯 <b>Jami tanlangan xizmatlar:</b> ${selectedCount}

━━━━━━━━━━━━━━━━━━
`;

    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleServiceToggle(ctx: Context, serviceId: number, categoryId: number) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.barberBookingStates.get(ctx.from.id);
    if (!state || state.step !== 'service' || !state.barberId) return;

    const selectedServiceIds = state.selectedServiceIds || [];
    const serviceIndex = selectedServiceIds.indexOf(serviceId);

    if (serviceIndex > -1) {
      // Remove service
      selectedServiceIds.splice(serviceIndex, 1);
    } else {
      // Add service
      selectedServiceIds.push(serviceId);
    }

    // Update state
    const currentPage = state.currentPage || 1;
    this.barberBookingStates.set(ctx.from.id, {
      ...state,
      selectedServiceIds,
    });

    // Re-render current category page
    await this.handleCategorySelect(ctx, categoryId, currentPage);
  }

  async handleServiceContinue(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.barberBookingStates.get(ctx.from.id);
    if (!state || state.step !== 'service' || !state.barberId) return;

    const selectedServiceIds = state.selectedServiceIds || [];
    if (selectedServiceIds.length === 0) {
      return ctx.reply('Iltimos, kamida bitta xizmat tanlang.');
    }

    const barber = await this.userService.findOne(state.barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    // Get selected services
    const selectedServices: BarberServiceEntity[] = [];
    for (const serviceId of selectedServiceIds) {
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

    // Group services by category for better display
    const servicesByCategory = selectedServices.reduce(
      (acc, service) => {
        const categoryName = service.category?.name || 'Boshqa';
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }
        acc[categoryName].push(service);
        return acc;
      },
      {} as Record<string, typeof selectedServices>,
    );

    // Format services list grouped by category
    const servicesList = Object.entries(servicesByCategory)
      .map(([categoryName, services]) => {
        const categoryIcon = services[0]?.category?.icon || '📁';
        const servicesText = services
          .map((s) => `   ✂️ ${s.name} (${s.duration} min)`)
          .join('\n');
        return `<b>${categoryIcon} ${categoryName}:</b>\n${servicesText}`;
      })
      .join('\n\n');

    const workTime =
      barber.work_start_time && barber.work_end_time
        ? `\n🕒 <b>Ish vaqti:</b> ${barber.work_start_time} - ${barber.work_end_time}`
        : '';

    const message = `
<b>💈 Barber:</b> ${barber.name}${workTime}

<b>🧾 Tanlangan xizmatlar</b>

━━━━━━━━━━━━━━━━━━
${servicesList}
━━━━━━━━━━━━━━━━━━

💰 <b>Jami narx:</b> ${totalPrice.toLocaleString()} so'm
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

    // Create inline keyboard for dates (2 columns)
    const keyboard = new InlineKeyboard();
    dates.forEach((date, index) => {
      const dateObj = new Date(date + 'T00:00:00');
      const weekday = dateObj.toLocaleDateString('uz-UZ', {
        weekday: 'short',
      });
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString('uz-UZ', {
        month: 'short',
      });
      const dateDisplay = `📅 ${weekday} • ${day}-${month}`;

      if (index % 2 === 0) {
        keyboard.text(
          dateDisplay,
          `barber_date_select_${date}`,
        );
      } else {
        keyboard
          .text(
            dateDisplay,
            `barber_date_select_${date}`,
          )
          .row();
      }
    });

    if (dates.length % 2 !== 0) {
      keyboard.row();
    }
    keyboard
      .text('⬅️ Ortga (Kategoriyalar)', 'barber_add_more_categories')
      .row();

    this.barberBookingStates.set(ctx.from.id, {
      ...state,
      step: 'date',
      selectedServiceIds,
    });

    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleDateSelection(ctx: Context, date: string) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.barberBookingStates.get(ctx.from.id);
    if (!state || !state.barberId || !state.selectedServiceIds) return;

    const barber = await this.userService.findOne(state.barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    const serviceIds = state.selectedServiceIds;

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

    // If today's date, filter out past time slots
    let filteredTimeSlots = timeSlots;
    if (this.isToday(date)) {
      const uzbekistanTime = this.getCurrentTimeInUzbekistan();
      const minimumTime = new Date(uzbekistanTime.getTime() + 30 * 60 * 1000);
      const minHour = minimumTime.getHours();
      const minMinute = minimumTime.getMinutes();

      filteredTimeSlots = timeSlots.filter((time) => {
        const [hours, minutes] = time.split(':').map(Number);
        const timeDate = new Date(
          uzbekistanTime.getFullYear(),
          uzbekistanTime.getMonth(),
          uzbekistanTime.getDate(),
          hours,
          minutes,
          0,
        );
        return timeDate >= minimumTime;
      });
    }

    // Check availability for each time slot
    const availableSlots: string[] = [];
    for (const time of filteredTimeSlots) {
      const isAvailable = await this.bookingService.checkTimeSlotAvailability(
        state.barberId,
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

    const message = `
📅 <b>Sana:</b> ${selectedDate}

⏱ <b>Xizmat davomiyligi:</b> ${totalDuration} daqiqa

<b>🕔 Bo'sh vaqtlar</b>

Quyidagi vaqtlardan birini tanlang:

━━━━━━━━━━━━━━━━━━
`;

    // Create inline keyboard for available times (3 columns)
    const keyboard = new InlineKeyboard();
    availableSlots.forEach((time, index) => {
      if (index > 0 && index % 3 === 0) {
        keyboard.row();
      }
      keyboard.text(
        `🕒 ${time}`,
        `barber_time_select_${date}_${time}`,
      );
    });

    if (availableSlots.length % 3 !== 0) {
      keyboard.row();
    }

    keyboard
      .row()
      .text(
        "✏️ Vaqtni o'zim kiritaman",
        `barber_time_input_${date}`,
      )
      .row()
      .text('⬅️ Ortga qaytish', 'barber_service_continue')
      .row();

    this.barberBookingStates.set(ctx.from.id, {
      ...state,
      step: 'time',
      date,
    });

    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleTimeSelection(ctx: Context, date: string, time: string) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.barberBookingStates.get(ctx.from.id);
    if (!state || !state.barberId || !state.selectedServiceIds) return;

    const barber = await this.userService.findOne(state.barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    const serviceIds = state.selectedServiceIds;

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

    // Validate time if today's date
    if (this.isToday(date)) {
      const uzbekistanTime = this.getCurrentTimeInUzbekistan();
      const minimumTime = new Date(uzbekistanTime.getTime() + 30 * 60 * 1000);
      const [hours, minutes] = time.split(':').map(Number);
      const bookingDateTime = new Date(
        uzbekistanTime.getFullYear(),
        uzbekistanTime.getMonth(),
        uzbekistanTime.getDate(),
        hours,
        minutes,
        0,
      );

      if (bookingDateTime < minimumTime) {
        const minTimeStr = this.getMinimumBookingTime();
        return ctx.reply(
          `Siz o'tgan vaqtni tanlay olmaysiz. Iltimos, hozirgi vaqtdan keyingi vaqtni tanlang. Eng kamida ${minTimeStr} vaqtini tanlashingiz kerak.`,
        );
      }
    }

    // Final availability check
    const isAvailable = await this.bookingService.checkTimeSlotAvailability(
      state.barberId,
      date,
      time,
      totalDuration,
    );

    if (!isAvailable) {
      return ctx.reply('Ushbu vaqt band. Iltimos, boshqa vaqtni tanlang.');
    }

    // Calculate totals
    const totalPrice = selectedServices.reduce(
      (sum, s) => sum + Number(s.price),
      0,
    );

    // Format date
    const dateObj = new Date(date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('uz-UZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Calculate end time
    const [hours, minutes] = time.split(':').map(Number);
    const startDate = new Date(`${date}T${time}:00`);
    const endDate = new Date(
      startDate.getTime() + totalDuration * 60 * 1000,
    );
    const endTimeStr = endDate.toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Update state
    this.barberBookingStates.set(ctx.from.id, {
      ...state,
      step: 'confirm',
      date,
      time,
    });

    // Show confirmation message
    const clientInfo = state.clientId
      ? `👤 <b>Mijoz:</b> ${state.clientName || "Noma'lum"}
📞 <b>Telefon:</b> ${state.clientPhone || "Yo'q"}
${state.clientUsername ? `💬 <b>Telegram:</b> @${state.clientUsername}\n` : ''}`
      : `👤 <b>Yangi mijoz:</b> ${state.clientName || "Noma'lum"}
📞 <b>Telefon:</b> ${state.clientPhone || "Yo'q"}
${state.clientUsername ? `💬 <b>Telegram:</b> @${state.clientUsername}\n` : ''}`;

    const servicesList = selectedServices
      .map((s) => `• ${s.name} – ${Number(s.price).toLocaleString()} so'm (${s.duration} daqiqa)`)
      .join('\n');

    const message = `<b>✅ Booking ma'lumotlari</b>

━━━━━━━━━━━━━━━━━━

${clientInfo}
💈 <b>Xizmatlar:</b>
${servicesList}

💵 <b>Jami:</b> ${totalPrice.toLocaleString()} so'm, ${totalDuration} daqiqa
📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${time} — ${endTimeStr}

━━━━━━━━━━━━━━━━━━

Booking yaratishni tasdiqlaysizmi?`;

    const keyboard = new InlineKeyboard();
    keyboard
      .text('✅ Tasdiqlash', 'barber_confirm_booking')
      .text('❌ Bekor qilish', 'barber_cancel_booking_creation')
      .row();

    try {
      return await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } catch (error) {
      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleTimeInput(ctx: Context, date: string, timeInput: string) {
    // Validate time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeInput)) {
      return ctx.reply(
        "Noto'g'ri vaqt formati. Iltimos, HH:mm formatida kiriting (masalan: 14:30).",
      );
    }

    return this.handleTimeSelection(ctx, date, timeInput);
  }

  async handleConfirmBooking(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.barberBookingStates.get(ctx.from.id);
    if (!state || state.step !== 'confirm' || !state.barberId || !state.selectedServiceIds || !state.date || !state.time) {
      return ctx.reply('Xatolik yuz berdi. Iltimos, qaytadan boshlang.');
    }

    const barber = await this.userService.findBarberByTgId(tgId);
    if (!barber) {
      return ctx.reply('Siz barber emassiz.');
    }

    // Mijozni topish yoki yaratish
    let client;
    if (state.clientId) {
      // Mavjud mijoz
      client = await this.userService.findOne(state.clientId);
      if (!client) {
        return ctx.reply('Mijoz topilmadi.');
      }
    } else {
      // Yangi mijoz yaratish
      try {
        client = await this.userService.create({
          name: state.clientName,
          phone_number: state.clientPhone,
          tg_username: state.clientUsername,
          role: UserRole.CLIENT,
        });
      } catch (error: any) {
        // Agar unique constraint xatosi bo'lsa, qayta topishga harakat qilamiz
        if (error?.message?.includes('allaqachon mavjud')) {
          if (state.clientPhone) {
            client = await this.userService.findByPhoneNumber(state.clientPhone);
          } else if (state.clientUsername) {
            client = await this.userService.findByTgUsername(state.clientUsername);
          }
          
          if (!client) {
            return ctx.reply('Mijoz yaratishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
          }
        } else {
          return ctx.reply('Mijoz yaratishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
        }
      }
    }

    if (!client || !client.id) {
      return ctx.reply("Mijoz ma'lumotlari topilmadi.");
    }

    // Telefon raqamni tekshirish
    const phoneNumber = client.phone_number || state.clientPhone;
    if (!phoneNumber) {
      return ctx.reply(
        "Mijozning telefon raqami ko'rsatilmagan. Iltimos, telefon raqamni kiriting.",
      );
    }

    // Booking yaratish
    try {
      const booking = await this.bookingService.create({
        phone_number: phoneNumber,
        barber_id: state.barberId,
        service_ids: state.selectedServiceIds,
        date: state.date,
        time: state.time,
        client_name: client.name || state.clientName,
      });

      // State'ni tozalash
      this.barberBookingStates.delete(ctx.from.id);

      const menu = getBarberReplyMenu();
      return ctx.reply(
        '✅ Booking muvaffaqiyatli yaratildi!\n\nMijozga xabar yuborildi (agar botga start bosgan bo\'lsa).',
        {
          reply_markup: menu,
          parse_mode: 'HTML',
        },
      );
    } catch (error: any) {
      console.error('Failed to create booking:', error);
      return ctx.reply(
        `Xatolik yuz berdi: ${error?.message || 'Noma\'lum xatolik'}. Iltimos, qayta urinib ko'ring.`,
      );
    }
  }

  // Helper methods
  private getCurrentTimeInUzbekistan(): Date {
    const now = new Date();
    return new Date(
      now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }),
    );
  }

  private isToday(date: string): boolean {
    const today = this.getCurrentTimeInUzbekistan()
      .toISOString()
      .split('T')[0];
    return date === today;
  }

  private getMinimumBookingTime(): string {
    const uzbekistanTime = this.getCurrentTimeInUzbekistan();
    const minimumTime = new Date(uzbekistanTime.getTime() + 30 * 60 * 1000);
    return `${minimumTime.getHours().toString().padStart(2, '0')}:${minimumTime.getMinutes().toString().padStart(2, '0')}`;
  }
}

