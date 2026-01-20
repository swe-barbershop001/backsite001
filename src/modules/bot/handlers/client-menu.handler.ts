import { Context, InlineKeyboard } from 'grammy';
import { UserService } from '../../user/user.service';
import { BarberServiceService } from '../../barber-service/barber-service.service';
import { BookingService } from '../../booking/booking.service';
import { ServiceCategoryService } from '../../service-category/service-category.service';
import { BookingStatus } from '../../../common/enums/booking-status.enum';
import { getClientReplyMenu, getAdminMainMenu, getAdminReplyMenu } from '../keyboards/main.menu';
import { UserRole } from '../../../common/enums/user.enum';
import { User } from '../../user/entities/user.entity';
import { BarberService as BarberServiceEntity } from '../../barber-service/entities/barber-service.entity';

type AdminBookingState = {
  step:
    | 'barber_select'
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

export class ClientMenuHandler {
  public adminBookingStates = new Map<number, AdminBookingState>();

  constructor(
    private userService: UserService,
    private barberServiceService?: BarberServiceService,
    private bookingService?: BookingService,
    private serviceCategoryService?: ServiceCategoryService,
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

  // Admin booking creation methods
  async handleAdminCreateClientBooking(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return ctx.reply('Siz admin emassiz.');
    }

    // Get all barbers
    const barbers = await this.userService.findAllBarbers();
    if (barbers.length === 0) {
      return ctx.reply("Hozircha barberlar yo'q.");
    }

    // State'ni boshlash
    this.adminBookingStates.set(ctx.from.id, {
      step: 'barber_select',
    });

    const message = `<b>👤 Mijoz uchun bron yaratish</b>

━━━━━━━━━━━━━━━━━━

Avval barberni tanlang:`;

    const keyboard = new InlineKeyboard();
    barbers.forEach((barber) => {
      const workTime =
        barber.work_start_time && barber.work_end_time
          ? ` (${barber.work_start_time} - ${barber.work_end_time})`
          : '';
      const usernameDisplay = barber.tg_username
        ? ` (@${barber.tg_username})`
        : '';
      keyboard
        .text(
          `👤 ${barber.name}${usernameDisplay}${workTime}`,
          `admin_barber_select_${barber.id}`,
        )
        .row();
    });
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

  async handleAdminBarberSelect(ctx: Context, barberId: number) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return ctx.reply('Siz admin emassiz.');
    }

    const barber = await this.userService.findOne(barberId);
    if (!barber) {
      return ctx.reply('Barber topilmadi.');
    }

    // State'ni yangilash
    this.adminBookingStates.set(ctx.from.id, {
      step: 'client_search',
      barberId: barber.id,
    });

    const message = `<b>👤 Mijoz uchun bron yaratish</b>

━━━━━━━━━━━━━━━━━━

💈 <b>Barber:</b> ${barber.name}

Mijozni qanday qidirmoqchisiz?`;

    const keyboard = new InlineKeyboard();
    keyboard
      .text('📞 Telefon raqam orqali qidirish', 'admin_search_client_phone')
      .row()
      .text('💬 Username orqali qidirish', 'admin_search_client_username')
      .row()
      .text('⬅️ Ortga qaytish', 'admin_create_client_booking');

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

  async handleAdminClientSearchByPhone(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.adminBookingStates.get(ctx.from.id);
    if (!state) return;

    // State'ni yangilash
    this.adminBookingStates.set(ctx.from.id, {
      ...state,
      step: 'client_search_phone',
    });

    const message = `<b>📞 Telefon raqam orqali qidirish</b>

━━━━━━━━━━━━━━━━━━

Iltimos, mijozning telefon raqamini kiriting:
(Masalan: +998901234567 yoki 998901234567)`;

    const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'admin_create_client_booking');

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

  async handleAdminClientSearchByUsername(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.adminBookingStates.get(ctx.from.id);
    if (!state) return;

    // State'ni yangilash
    this.adminBookingStates.set(ctx.from.id, {
      ...state,
      step: 'client_search_username',
    });

    const message = `<b>💬 Username orqali qidirish</b>

━━━━━━━━━━━━━━━━━━

Iltimos, mijozning Telegram username'ini kiriting:
(Masalan: @username yoki username)`;

    const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'admin_create_client_booking');

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

  async handleAdminClientSearchInput(ctx: Context, input: string) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.adminBookingStates.get(ctx.from.id);
    if (!state) return;

    let client: User | null = null;
    let searchType = '';

    if (state.step === 'client_search_phone') {
      // Telefon raqam orqali qidirish
      searchType = 'phone';
      const phoneNumber = input.trim().replace(/\s+/g, '');
      client = await this.userService.findByPhoneNumber(phoneNumber);
      
      if (client) {
        this.adminBookingStates.set(ctx.from.id, {
          ...state,
          step: 'client_info',
          clientId: client.id,
          clientPhone: client.phone_number || phoneNumber,
          clientUsername: client.tg_username,
          clientName: client.name,
        });
      } else {
        this.adminBookingStates.set(ctx.from.id, {
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
        this.adminBookingStates.set(ctx.from.id, {
          ...state,
          step: 'client_info',
          clientId: client.id,
          clientPhone: client.phone_number,
          clientUsername: client.tg_username || username,
          clientName: client.name,
        });
      } else {
        this.adminBookingStates.set(ctx.from.id, {
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
        .text('✅ Bu mijozni tanlash', `admin_select_client_${client.id}`)
        .row()
        .text('⬅️ Ortga qaytish', 'admin_create_client_booking');

      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    } else {
      // Mijoz topilmadi, yangi mijoz yaratish - ism so'rash
      // State'ni yangilash
      this.adminBookingStates.set(ctx.from.id, {
        ...state,
        step: 'client_info_name',
        clientPhone: searchType === 'phone' ? input.trim().replace(/\s+/g, '') : undefined,
        clientUsername: searchType === 'username' ? input.trim().replace('@', '') : undefined,
      });

      const message = `<b>❌ Mijoz topilmadi</b>

━━━━━━━━━━━━━━━━━━

Bu ${searchType === 'phone' ? 'telefon raqam' : 'username'} bilan mijoz topilmadi.

Yangi mijoz yaratish uchun mijozning <b>ismini</b> kiriting:`;

      const keyboard = new InlineKeyboard().text('⬅️ Ortga qaytish', 'admin_create_client_booking');

      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }
  }

  async handleAdminClientInfoInput(ctx: Context, input: string) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.adminBookingStates.get(ctx.from.id);
    if (!state) return;

    // Ism so'rash bosqichi
    if (state.step === 'client_info_name') {
      const trimmedName = input.trim();
      if (!trimmedName) {
        return ctx.reply('Iltimos, mijozning ismini kiriting.');
      }

      // Ismni saqlash va telefon raqam so'rashga o'tish
      this.adminBookingStates.set(ctx.from.id, {
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
        .text('⏭️ O\'tkazib yuborish', 'admin_skip_phone')
        .row()
        .text('⬅️ Ortga qaytish', 'admin_create_client_booking');

      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }

    // Telefon raqam so'rash bosqichi
    if (state.step === 'client_info_phone') {
      const trimmedPhone = input.trim().replace(/\s+/g, '');
      
      // Telefon raqamni saqlash va username so'rashga o'tish
      this.adminBookingStates.set(ctx.from.id, {
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
        .text('⏭️ O\'tkazib yuborish', 'admin_skip_username')
        .row()
        .text('⬅️ Ortga qaytish', 'admin_create_client_booking');

      return ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
    }

    // Username so'rash bosqichi
    if (state.step === 'client_info_username') {
      const trimmedUsername = input.trim().replace('@', '');
      
      // Username'ni saqlash va xizmatlarni tanlashga o'tish
      this.adminBookingStates.set(ctx.from.id, {
        ...state,
        step: 'service',
        clientUsername: trimmedUsername || state.clientUsername,
      });

      // Xizmatlarni tanlash bosqichini boshlash
      return this.handleAdminServiceSelectionStart(ctx);
    }
  }

  async handleAdminSkipPhone(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.adminBookingStates.get(ctx.from.id);
    if (!state || state.step !== 'client_info_phone') return;

    // Telefon raqamni o'tkazib yuborish va username so'rashga o'tish
    this.adminBookingStates.set(ctx.from.id, {
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
      .text('⏭️ O\'tkazib yuborish', 'admin_skip_username')
      .row()
      .text('⬅️ Ortga qaytish', 'admin_create_client_booking');

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

  async handleAdminSkipUsername(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.adminBookingStates.get(ctx.from.id);
    if (!state || state.step !== 'client_info_username') return;

    // Username'ni o'tkazib yuborish va xizmatlarni tanlashga o'tish
    this.adminBookingStates.set(ctx.from.id, {
      ...state,
      step: 'service',
    });

    // Xizmatlarni tanlash bosqichini boshlash
    return this.handleAdminServiceSelectionStart(ctx);
  }

  async handleAdminSelectClient(ctx: Context, clientId: number) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.adminBookingStates.get(ctx.from.id);
    if (!state) return;

    const client = await this.userService.findOne(clientId);
    if (!client) {
      return ctx.reply('Mijoz topilmadi.');
    }

    // State'ni yangilash
    this.adminBookingStates.set(ctx.from.id, {
      ...state,
      step: 'client_info',
      clientId: client.id,
      clientPhone: client.phone_number,
      clientUsername: client.tg_username,
      clientName: client.name,
    });

    // Xizmatlarni tanlash bosqichini boshlash
    return this.handleAdminServiceSelectionStart(ctx);
  }

  async handleAdminServiceSelectionStart(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.adminBookingStates.get(ctx.from.id);
    if (!state || !state.barberId) return;

    if (!this.serviceCategoryService) {
      return ctx.reply('Service category servisi mavjud emas.');
    }

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
          `admin_category_select_${category.id}`,
        )
        .row();
    });
    keyboard.text('⬅️ Ortga qaytish', 'admin_create_client_booking').row();

    this.adminBookingStates.set(ctx.from.id, {
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

  async handleAdminCategorySelect(ctx: Context, categoryId: number, page: number = 1) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.adminBookingStates.get(ctx.from.id);
    if (!state || !state.barberId) return;

    if (!this.barberServiceService || !this.serviceCategoryService) {
      return ctx.reply('Xizmatlar servisi mavjud emas.');
    }

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
          `admin_service_toggle_${service.id}_${categoryId}`,
        )
        .row();
    });

    // Pagination buttons
    if (totalPages > 1) {
      const paginationRow: Array<{ text: string; callback_data: string }> = [];
      if (currentPage > 1) {
        paginationRow.push({
          text: '⬅️',
          callback_data: `admin_category_page_${categoryId}_${currentPage - 1}`,
        });
      }
      if (currentPage < totalPages) {
        paginationRow.push({
          text: '➡️',
          callback_data: `admin_category_page_${categoryId}_${currentPage + 1}`,
        });
      }
      if (paginationRow.length > 0) {
        keyboard.row(...paginationRow);
      }
    }

    // Action buttons
    keyboard
      .row()
      .text('📂 Yana kategoriya qo\'shish', 'admin_add_more_categories')
      .row()
      .text('✅ Davom etish', 'admin_service_continue')
      .row();

    // Update state
    this.adminBookingStates.set(ctx.from.id, {
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

  async handleAdminServiceToggle(ctx: Context, serviceId: number, categoryId: number) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.adminBookingStates.get(ctx.from.id);
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
    this.adminBookingStates.set(ctx.from.id, {
      ...state,
      selectedServiceIds,
    });

    // Re-render current category page
    await this.handleAdminCategorySelect(ctx, categoryId, currentPage);
  }

  async handleAdminServiceContinue(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.adminBookingStates.get(ctx.from.id);
    if (!state || state.step !== 'service' || !state.barberId) return;

    const selectedServiceIds = state.selectedServiceIds || [];
    if (selectedServiceIds.length === 0) {
      return ctx.reply('Iltimos, kamida bitta xizmat tanlang.');
    }

    if (!this.barberServiceService) {
      return ctx.reply('Xizmatlar servisi mavjud emas.');
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
          `admin_date_select_${date}`,
        );
      } else {
        keyboard
          .text(
            dateDisplay,
            `admin_date_select_${date}`,
          )
          .row();
      }
    });

    if (dates.length % 2 !== 0) {
      keyboard.row();
    }
    keyboard
      .text('⬅️ Ortga (Kategoriyalar)', 'admin_add_more_categories')
      .row();

    this.adminBookingStates.set(ctx.from.id, {
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

  async handleAdminDateSelection(ctx: Context, date: string) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.adminBookingStates.get(ctx.from.id);
    if (!state || !state.barberId || !state.selectedServiceIds) return;

    if (!this.barberServiceService || !this.bookingService) {
      return ctx.reply('Xizmatlar servisi mavjud emas.');
    }

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
        `admin_time_select_${date}_${time}`,
      );
    });

    if (availableSlots.length % 3 !== 0) {
      keyboard.row();
    }

    keyboard
      .row()
      .text(
        "✏️ Vaqtni o'zim kiritaman",
        `admin_time_input_${date}`,
      )
      .row()
      .text('⬅️ Ortga qaytish', 'admin_service_continue')
      .row();

    this.adminBookingStates.set(ctx.from.id, {
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

  async handleAdminTimeSelection(ctx: Context, date: string, time: string) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.adminBookingStates.get(ctx.from.id);
    if (!state || !state.barberId || !state.selectedServiceIds) return;

    if (!this.barberServiceService || !this.bookingService) {
      return ctx.reply('Xizmatlar servisi mavjud emas.');
    }

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
    this.adminBookingStates.set(ctx.from.id, {
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
      .text('✅ Tasdiqlash', 'admin_confirm_booking')
      .text('❌ Bekor qilish', 'admin_cancel_booking_creation')
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

  async handleAdminTimeInput(ctx: Context, date: string, timeInput: string) {
    // Validate time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeInput)) {
      return ctx.reply(
        "Noto'g'ri vaqt formati. Iltimos, HH:mm formatida kiriting (masalan: 14:30).",
      );
    }

    return this.handleAdminTimeSelection(ctx, date, timeInput);
  }

  async handleAdminConfirmBooking(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const state = this.adminBookingStates.get(ctx.from.id);
    if (!state || state.step !== 'confirm' || !state.barberId || !state.selectedServiceIds || !state.date || !state.time) {
      return ctx.reply('Xatolik yuz berdi. Iltimos, qaytadan boshlang.');
    }

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return ctx.reply('Siz admin emassiz.');
    }

    if (!this.bookingService) {
      return ctx.reply('Booking servisi mavjud emas.');
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
      this.adminBookingStates.delete(ctx.from.id);

      const menu = getAdminReplyMenu();
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

