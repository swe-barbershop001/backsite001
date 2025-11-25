import { Keyboard } from 'grammy';

export const getClientMainMenu = () => {
  return new Keyboard()
    .text('💈 Book Service')
    .text('📋 My Bookings')
    .row()
    .text('ℹ My Profile')
    .resized();
};

export const getBarberMainMenu = () => {
  return new Keyboard()
    .text('📋 My Bookings')
    .row()
    .text('⏱ Start Shift')
    .text('⏹ End Shift')
    .row()
    .text('🛠 My Services')
    .text('ℹ My Profile')
    .resized();
};

