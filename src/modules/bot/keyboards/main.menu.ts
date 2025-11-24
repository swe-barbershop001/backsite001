import { Keyboard } from 'grammy';

/**
 * Asosiy keyboardlar - Client va Barber uchun reply keyboardlar
 */

/**
 * Client uchun asosiy keyboard
 * @returns Client uchun reply keyboard
 */
export function getClientKeyboard(): Keyboard {
  const keyboard = new Keyboard();
  keyboard.text('💈 Bron yaratish').row().text('📋 Mening bronlarim');
  return keyboard.resized().persistent();
}

/**
 * Barber uchun asosiy keyboard
 * @returns Barber uchun reply keyboard
 */
export function getBarberKeyboard(): Keyboard {
  const keyboard = new Keyboard();
  keyboard
    .text('📋 Mening bronlarim')
    .row()
    .text('⏱ Shiftni boshlash')
    .text('⏹ Shiftni yakunlash');
  return keyboard.resized().persistent();
}

/**
 * Bo'sh keyboard (foydalanuvchi ro'yxatdan o'tmagan bo'lsa)
 * @returns Bo'sh keyboard
 */
export function getEmptyKeyboard(): Keyboard {
  return new Keyboard().resized().persistent();
}

