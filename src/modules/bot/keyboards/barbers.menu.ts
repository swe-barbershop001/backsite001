import { InlineKeyboard } from 'grammy';

/**
 * Barber va Barbershop uchun inline keyboardlar
 */

/**
 * Barbershop tanlash uchun keyboard (booking yaratishda)
 * @param barbershops - Barbershoplar ro'yxati
 * @returns Inline keyboard
 */
export function getBarbershopsKeyboard(barbershops: any[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  barbershops.forEach((shop) => {
    keyboard.text(shop.name, `barbershop_${shop.id}`).row();
  });
  return keyboard;
}

/**
 * Barber tanlash uchun keyboard (booking yaratishda)
 * @param barbers - Barberlar ro'yxati
 * @returns Inline keyboard
 */
export function getBarbersKeyboard(barbers: any[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  barbers.forEach((barber) => {
    keyboard.text(barber.name, `barber_${barber.id}`).row();
  });
  return keyboard;
}

/**
 * Barber request uchun barbershop tanlash keyboardi
 * @param barbershops - Barbershoplar ro'yxati
 * @returns Inline keyboard
 */
export function getBarbershopsForBarberRequestKeyboard(
  barbershops: any[],
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  barbershops.forEach((shop) => {
    keyboard.text(shop.name, `barbershop_for_barber_${shop.id}`).row();
  });
  return keyboard;
}

/**
 * Admin uchun barber requestni tasdiqlash/rad etish keyboardi
 * @param requestId - Barber request ID
 * @returns Inline keyboard
 */
export function getBarberRequestActionKeyboard(requestId: number): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  keyboard
    .text('✔ Tasdiqlash', `approve_barber_${requestId}`)
    .text('✖ Rad etish', `reject_barber_${requestId}`);
  return keyboard;
}

/**
 * Sana tanlash uchun keyboard (keyingi 7 kun)
 * @returns Inline keyboard
 */
export function getDateSelectionKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Keyingi 7 kunni generatsiya qilish
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }

  dates.forEach((date, index) => {
    const dateStr = date.toISOString().split('T')[0];
    const displayDate = date.toLocaleDateString('uz-UZ', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    keyboard.text(displayDate, `date_${dateStr}`);

    // Har ikkita tugmadan keyin yangi qator
    if ((index + 1) % 2 === 0 || index === dates.length - 1) {
      keyboard.row();
    }
  });

  return keyboard;
}

/**
 * Vaqt tanlash uchun keyboard
 * @param timeSlots - Mavjud vaqtlar ro'yxati
 * @returns Inline keyboard
 */
export function getTimeSelectionKeyboard(timeSlots: string[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  timeSlots.forEach((time) => {
    keyboard.text(time, `time_${time}`).row();
  });
  return keyboard;
}

/**
 * Foydalanuvchi turini tanlash keyboardi (Client yoki Barber)
 * @returns Inline keyboard
 */
export function getUserTypeSelectionKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  keyboard
    .text('👤 Client', 'user_type_client')
    .text('✂️ Barber', 'user_type_barber')
    .row();
  return keyboard;
}

