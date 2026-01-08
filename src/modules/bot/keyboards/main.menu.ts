import { InlineKeyboard, Keyboard } from 'grammy';

/**
 * Mijozlar uchun asosiy inline keyboard (eski)
 * @deprecated Use getClientReplyMenu instead
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
 * Mijozlar uchun reply keyboard (yangi)
 * Doimiy tugmalar - text message orqali ishlaydi
 */
export const getClientReplyMenu = () => {
  return new Keyboard()
    .text('💈 Xizmatlar')
    .row()
    .text('📅 Bronlarim')
    .row()
    .text('👤 Profil')
    .resized()
    .persistent();
};

/**
 * Sartaroshlar uchun asosiy inline keyboard (eski)
 * @deprecated Use getBarberReplyMenu instead
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
 * Sartaroshlar uchun reply keyboard (yangi)
 * Doimiy tugmalar - text message orqali ishlaydi
 */
export const getBarberReplyMenu = () => {
  return new Keyboard()
    .text('📋 Bronlarim')
    .row()
    .text('📋 Bronlarni boshqarish')
    .row()
    .text('👤 Mijoz uchun bron yaratish')
    .row()
    .text('🕒 Ishni boshlash')
    .text('⬛ Ishni tugatish')
    .row()
    .text('🛠 Xizmatlarim')
    .text('👤 Profilim')
    .resized()
    .persistent();
};

/**
 * Admin va Super Admin uchun asosiy inline keyboard (eski)
 * @deprecated Use getAdminReplyMenu instead
 */
export const getAdminMainMenu = () => {
  return new InlineKeyboard()
    .text('📋 Yakunlanmagan bookinglar', 'admin_bookings')
    .row()
    .text('👨‍💼 Barberlar', 'admin_barbers')
    .text('📢 Post yuborish', 'admin_post')
    .row()
    .text('👤 Profil', 'admin_profile');
};

/**
 * Admin va Super Admin uchun reply keyboard (yangi)
 * Doimiy tugmalar - text message orqali ishlaydi
 */
export const getAdminReplyMenu = () => {
  return new Keyboard()
    .text('📋 Yakunlanmagan bookinglar')
    .row()
    .text('📋 Bookinglarni boshqarish')
    .row()
    .text('💈 Barberlar')
    .text('📢 Post yuborish')
    .row()
    .text('👤 Profil')
    .resized()
    .persistent();
};
