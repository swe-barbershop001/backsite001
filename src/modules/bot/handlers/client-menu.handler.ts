import { Context, InlineKeyboard } from 'grammy';
import { UserService } from '../../user/user.service';
import { getClientMainMenu, getAdminMainMenu } from '../keyboards/main.menu';
import { UserRole } from '../../../common/enums/user.enum';

export class ClientMenuHandler {
  constructor(private userService: UserService) {}

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
}

