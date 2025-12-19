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
 */
export const getBarberMainMenu = () => {
  return new InlineKeyboard()
    .text('📋 Bronlarim', 'barber_bookings')
    .row()
    .text('🕒 Ishni boshlash', 'start_shift')
    .text('⬛ Ishni tugatish', 'end_shift')
    .row()
    .text('🛠 Xizmatlarim', 'barber_services')
    .text('👤 Profilim', 'barber_profile');
};

/**
 * Admin va Super Admin uchun asosiy keyboard
 */
export const getAdminMainMenu = () => {
  return new InlineKeyboard()
    .text('📋 Yakunlanmagan bookinglar', 'admin_bookings')
    .row()
    .text('📢 Post yuborish', 'admin_post')
    .row()
    .text('👤 Profil', 'admin_profile');
};

