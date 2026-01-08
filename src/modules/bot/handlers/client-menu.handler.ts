import { Context, InlineKeyboard } from 'grammy';
import { UserService } from '../../user/user.service';
import { BarberServiceService } from '../../barber-service/barber-service.service';
import { BookingService } from '../../booking/booking.service';
import { BookingStatus } from '../../../common/enums/booking-status.enum';
import { getClientReplyMenu, getAdminMainMenu } from '../keyboards/main.menu';
import { UserRole } from '../../../common/enums/user.enum';

export class ClientMenuHandler {
  constructor(
    private userService: UserService,
    private barberServiceService?: BarberServiceService,
    private bookingService?: BookingService,
  ) {}

  async handleMyProfile(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const client = await this.userService.findClientByTgId(tgId);
    if (!client) {
      return ctx.reply('Iltimos, avval ro\'yxatdan o\'ting: /start');
    }

    const profileMessage = `
<b>🧾 Profil ma'lumotlari</b>

──────────────
👤 <b>Ism:</b> ${client.name}
📞 <b>Telefon:</b> ${client.phone_number || "Yo'q"}
💬 <b>Telegram:</b> ${client.tg_username ? `@${client.tg_username}` : 'Yo\'q'}
📅 <b>Ro'yxatdan o'tgan:</b> ${client.created_at.toLocaleDateString('uz-UZ')}
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

  async handleAdminProfile(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return ctx.reply('Siz admin emassiz.');
    }

    const roleName = user.role === UserRole.ADMIN ? 'Administrator' : 'Super Administrator';
    const profileMessage = `
<b>👑 ${roleName} Profil</b>

──────────────
👤 <b>Ism:</b> ${user.name}
📞 <b>Telefon:</b> ${user.phone_number || "Yo'q"}
💬 <b>Telegram:</b> ${user.tg_username ? `@${user.tg_username}` : 'Yo\'q'}
🆔 <b>Telegram ID:</b> ${user.tg_id || "Yo'q"}
👑 <b>Rol:</b> ${roleName}
📅 <b>Ro'yxatdan o'tgan:</b> ${user.created_at.toLocaleDateString('uz-UZ')}
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

  async handleAdminServices(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return ctx.reply('Siz admin emassiz.');
    }

    if (!this.barberServiceService) {
      return ctx.reply('Xizmatlar servisi mavjud emas.');
    }

    // Get all available services
    const services = await this.barberServiceService.findAll();
    if (services.length === 0) {
      return ctx.reply("Hozircha mavjud xizmatlar yo'q.");
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

  async handleAdminBookings(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return ctx.reply('Siz admin emassiz.');
    }

    if (!this.bookingService) {
      return ctx.reply('Booking servisi mavjud emas.');
    }

    // Yakunlanmagan booking'larni topish
    const bookings = await this.bookingService.findUncompletedBookings();

    if (bookings.length === 0) {
      const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'menu_back');
      const message = "📋 Yakunlanmagan bookinglar yo'q.\n\nBarcha bookinglar yakunlangan.";
      
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

    // Booking'larni guruhlash (bir xil client_id, barber_id, date, time)
    const groupedBookings = new Map<string, typeof bookings>();
    bookings.forEach((booking) => {
      const key = `${booking.client_id}_${booking.barber_id}_${booking.date}_${booking.time}`;
      if (!groupedBookings.has(key)) {
        groupedBookings.set(key, []);
      }
      groupedBookings.get(key)!.push(booking);
    });

    // Har bir guruh uchun alohida xabar yuborish
    let index = 0;
    for (const [key, groupBookings] of groupedBookings) {
      const firstBooking = groupBookings[0];
      if (!firstBooking.client || !firstBooking.barber) continue;

      index++;
      
      // Status display
      const statusDisplay = this.bookingService.getStatusDisplayInUzbek(
        firstBooking.status,
      );

      // Xizmatlar ro'yxati
      const servicesList = groupBookings
        .map((b) => b.service)
        .filter((s) => s !== null)
        .map((s) => `• ${s.name} – ${Number(s.price).toLocaleString()} so'm (${s.duration} daqiqa)`)
        .join('\n');

      const totalPrice = groupBookings
        .map((b) => b.service)
        .filter((s) => s !== null)
        .reduce((sum, s) => sum + Number(s.price), 0);

      const totalDuration = groupBookings
        .map((b) => b.service)
        .filter((s) => s !== null)
        .reduce((sum, s) => sum + s.duration, 0);

      const formattedDate = formatDate(firstBooking.date);

      const message = `<b>📋 Yakunlanmagan booking #${index}</b>

━━━━━━━━━━━━━━━━━━

👤 <b>Mijoz:</b> ${firstBooking.client.name}${firstBooking.client.tg_username ? ` (@${firstBooking.client.tg_username})` : ''}
📞 <b>Telefon:</b> ${firstBooking.client.phone_number || "Yo'q"}
👨‍🔧 <b>Barber:</b> ${firstBooking.barber.name}

💈 <b>Xizmatlar:</b>
${servicesList}

💵 <b>Jami:</b> ${totalPrice.toLocaleString()} so'm, ${totalDuration} daqiqa
📅 <b>Sana:</b> ${formattedDate}
🕒 <b>Vaqt:</b> ${firstBooking.time}
📋 <b>Status:</b> ${statusDisplay}

━━━━━━━━━━━━━━━━━━
`;

      // Har bir guruh uchun inline keyboard yaratish
      const keyboard = new InlineKeyboard();
      
      if (firstBooking.status === BookingStatus.PENDING) {
        keyboard
          .text('✅ Tasdiqlash', `approve_booking_${firstBooking.id}`)
          .text('❌ Bekor qilish', `reject_booking_${firstBooking.id}`)
          .row();
      } else if (firstBooking.status === BookingStatus.APPROVED) {
        keyboard
          .text('✅ Yakunlash', `complete_booking_${firstBooking.id}`)
          .row();
      }
      
      keyboard.text('⬅️ Ortga qaytish', 'menu_back');

      // Har bir booking uchun xabar va keyboard yuborish
      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleAdminBarbers(ctx: Context, page: number = 1) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return ctx.reply('Siz admin emassiz.');
    }

    // Get all barbers
    const allBarbers = await this.userService.findAllBarbers();
    
    if (allBarbers.length === 0) {
      return ctx.reply("Hozircha barberlar yo'q.");
    }

    // Pagination settings
    const itemsPerPage = 5;
    const totalPages = Math.ceil(allBarbers.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const barbersOnPage = allBarbers.slice(startIndex, endIndex);

    // Format barber list
    const barbersList = barbersOnPage.map((barber, index) => {
      const globalIndex = startIndex + index + 1;
      const workingStatus = barber.working ? '🟢 Ishlayapti' : '🔴 Ishlamayapti';
      const workTime = barber.work_start_time && barber.work_end_time
        ? `\n   🕒 Ish vaqti: ${barber.work_start_time} - ${barber.work_end_time}`
        : '';
      const tgUsername = barber.tg_username ? `\n   💬 @${barber.tg_username}` : '';
      const phone = barber.phone_number ? `\n   📞 ${barber.phone_number}` : '';
      
      return `<b>${globalIndex}. ${barber.name}</b>
   ${workingStatus}${workTime}${tgUsername}${phone}`;
    }).join('\n\n');

    const message = `💈 <b>Barberlar ro'yxati</b>

━━━━━━━━━━━━━━━━━━

${barbersList}

━━━━━━━━━━━━━━━━━━

📊 <b>Jami:</b> ${allBarbers.length} ta barber`;

    // Pagination keyboard
    const keyboard = new InlineKeyboard();
    
    if (totalPages > 1) {
      if (page > 1) {
        keyboard.text('⬅️ Oldingi', `barbers_page_${page - 1}`);
      }
      
      if (page < totalPages) {
        keyboard.text('Keyingi ➡️', `barbers_page_${page + 1}`);
      }
      
      keyboard.row();
    }

    return ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  }

  async handleManageBookings(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return ctx.reply('Siz admin emassiz.');
    }

    if (!this.bookingService) {
      return ctx.reply('Booking servisi mavjud emas.');
    }

    // Barcha PENDING va APPROVED bookinglarni sanash
    const pendingBookings = await this.bookingService.findPendingBookings();
    const approvedBookings = await this.bookingService.findApprovedBookings();

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
      keyboard.text(`🟡 Kutilayotgan bookinglar (${pendingCount} ta)`, `admin_pending_bookings_page_1`).row();
    }
    
    if (approvedCount > 0) {
      keyboard.text(`🟢 Tasdiqlangan bookinglar (${approvedCount} ta)`, `admin_approved_bookings_page_1`).row();
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

  async handleAdminPendingBookings(ctx: Context, page: number = 1) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return ctx.reply('Siz admin emassiz.');
    }

    if (!this.bookingService) {
      return ctx.reply('Booking servisi mavjud emas.');
    }

    const allBookings = await this.bookingService.findPendingBookings();

    if (allBookings.length === 0) {
      const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'admin_manage_bookings');
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
      const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'admin_manage_bookings');
      return ctx.reply('Booking topilmadi.', { reply_markup: keyboard });
    }

    const firstBooking = currentBookingGroup[0];
    const client = firstBooking.client;
    const barber = firstBooking.barber;
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
👨‍🔧 <b>Barber:</b> ${barber?.name || "Noma'lum"}

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
      .text('✅ Tasdiqlash', `approve_booking_${firstBooking.id}`)
      .text('❌ Bekor qilish', `reject_booking_${firstBooking.id}`)
      .row();

    // Pagination tugmalari
    if (totalPages > 1) {
      if (currentPage > 1) {
        keyboard.text('⬅️ Oldingi', `admin_pending_bookings_page_${currentPage - 1}`);
      }
      if (currentPage < totalPages) {
        keyboard.text('Keyingi ➡️', `admin_pending_bookings_page_${currentPage + 1}`);
      }
      keyboard.row();
    }

    keyboard.text('⬅️ Ortga qaytish', 'admin_manage_bookings');

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

  async handleAdminApprovedBookings(ctx: Context, page: number = 1) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return ctx.reply('Siz admin emassiz.');
    }

    if (!this.bookingService) {
      return ctx.reply('Booking servisi mavjud emas.');
    }

    const allBookings = await this.bookingService.findApprovedBookings();

    if (allBookings.length === 0) {
      const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'admin_manage_bookings');
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
      const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'admin_manage_bookings');
      return ctx.reply('Booking topilmadi.', { reply_markup: keyboard });
    }

    const firstBooking = currentBookingGroup[0];
    const client = firstBooking.client;
    const barber = firstBooking.barber;
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
👨‍🔧 <b>Barber:</b> ${barber?.name || "Noma'lum"}

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
      .text('✅ Yakunlash', `complete_booking_${firstBooking.id}`)
      .row();

    // Pagination tugmalari
    if (totalPages > 1) {
      if (currentPage > 1) {
        keyboard.text('⬅️ Oldingi', `admin_approved_bookings_page_${currentPage - 1}`);
      }
      if (currentPage < totalPages) {
        keyboard.text('Keyingi ➡️', `admin_approved_bookings_page_${currentPage + 1}`);
      }
      keyboard.row();
    }

    keyboard.text('⬅️ Ortga qaytish', 'admin_manage_bookings');

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
}

