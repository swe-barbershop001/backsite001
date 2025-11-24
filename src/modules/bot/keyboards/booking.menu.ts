import { InlineKeyboard } from 'grammy';
import { BookingStatus } from '../../../common/constants';

/**
 * Booking (Bron) uchun inline keyboardlar
 */

/**
 * Barber uchun booking tasdiqlash/rad etish keyboardi
 * @param bookingId - Booking ID
 * @returns Inline keyboard
 */
export function getBarberBookingActionKeyboard(bookingId: number): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  keyboard
    .text('✔ Tasdiqlash', `approve_booking_${bookingId}`)
    .text('❌ Rad etish', `reject_booking_${bookingId}`);
  return keyboard;
}

/**
 * Client uchun pending bookinglarni bekor qilish keyboardi
 * @param bookings - Pending bookinglar ro'yxati
 * @returns Inline keyboard
 */
export function getClientCancelBookingKeyboard(bookings: any[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  bookings.forEach((booking) => {
    keyboard
      .text(
        `❌ Bekor qilish: ${booking.date} ${booking.time}`,
        `cancel_booking_${booking.id}`,
      )
      .row();
  });
  return keyboard;
}

/**
 * Barber uchun pending bookinglarni tasdiqlash/rad etish keyboardi
 * @param bookings - Pending bookinglar ro'yxati
 * @returns Inline keyboard
 */
export function getBarberPendingBookingsKeyboard(bookings: any[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  bookings.forEach((booking) => {
    const clientName = booking.client?.fullName || "Noma'lum";
    keyboard
      .text(
        `✅ ${booking.date} ${booking.time} - ${clientName}`,
        `approve_booking_${booking.id}`,
      )
      .text(
        `❌ ${booking.date} ${booking.time} - ${clientName}`,
        `reject_booking_${booking.id}`,
      )
      .row();
  });
  return keyboard;
}

/**
 * Barber uchun approved bookinglarni bekor qilish keyboardi
 * @param bookings - Approved bookinglar ro'yxati
 * @returns Inline keyboard
 */
export function getBarberCancelApprovedBookingsKeyboard(bookings: any[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  bookings.forEach((booking) => {
    const clientName = booking.client?.fullName || "Noma'lum";
    keyboard
      .text(
        `🚫 Bekor qilish: ${booking.date} ${booking.time} - ${clientName}`,
        `cancel_booking_by_barber_${booking.id}`,
      )
      .row();
  });
  return keyboard;
}

/**
 * Barber uchun barcha bookinglar (pending + approved) uchun kombinatsiyalangan keyboard
 * @param pendingBookings - Pending bookinglar
 * @param approvedBookings - Approved bookinglar
 * @returns Inline keyboard
 */
export function getBarberAllBookingsKeyboard(
  pendingBookings: any[],
  approvedBookings: any[],
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Pending bookinglar uchun tasdiqlash/rad etish tugmalari
  if (pendingBookings.length > 0) {
    pendingBookings.forEach((booking) => {
      const clientName = booking.client?.fullName || "Noma'lum";
      keyboard
        .text(
          `✅ ${booking.date} ${booking.time} - ${clientName}`,
          `approve_booking_${booking.id}`,
        )
        .text(
          `❌ ${booking.date} ${booking.time} - ${clientName}`,
          `reject_booking_${booking.id}`,
        )
        .row();
    });
  }

  // Approved bookinglar uchun bekor qilish tugmalari
  if (approvedBookings.length > 0) {
    approvedBookings.forEach((booking) => {
      const clientName = booking.client?.fullName || "Noma'lum";
      keyboard
        .text(
          `🚫 Bekor qilish: ${booking.date} ${booking.time} - ${clientName}`,
          `cancel_booking_by_barber_${booking.id}`,
        )
        .row();
    });
  }

  return keyboard;
}

