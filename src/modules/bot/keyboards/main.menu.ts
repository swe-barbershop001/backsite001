import { InlineKeyboard } from 'grammy';

/**
 * Mijozlar uchun asosiy inline keyboard
 * Har bir tugma alohida row'da joylashgan
 */
export const getClientMainMenu = () => {
  return new InlineKeyboard()
    .text('💈 Xizmatlar', 'menu_services')
    .row()
    .text('📅 Bronlarim', 'menu_bookings')
    .row()
    .text('👤 Profil', 'menu_profile');
};

/**
 * Sartaroshlar uchun asosiy keyboard
 * (hozircha o'zgartirilmadi, lekin kelajakda inline qilish mumkin)
 */
export const getBarberMainMenu = () => {
  return new InlineKeyboard()
    .text('📋 My Bookings')
    .row()
    .text('⏱ Start Shift')
    .text('⏹ End Shift')
    .row()
    .text('🛠 My Services')
    .text('ℹ My Profile');
};

