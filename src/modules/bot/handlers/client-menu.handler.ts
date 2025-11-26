import { Context, InlineKeyboard } from 'grammy';
import { UserService } from '../../user/user.service';
import { getClientMainMenu } from '../keyboards/main.menu';

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
}

