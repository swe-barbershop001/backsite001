import { Context } from 'grammy';
import { ClientService } from '../../client/client.service';
import { getClientMainMenu } from '../keyboards/main.menu';

export class ClientMenuHandler {
  constructor(private clientService: ClientService) {}

  async handleMyProfile(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId) return;

    const client = await this.clientService.findByTgId(tgId);
    if (!client) {
      return ctx.reply('Iltimos, avval ro\'yxatdan o\'ting: /start');
    }

    const menu = getClientMainMenu();
    return ctx.reply(
      `ℹ️ Sizning profilingiz:\n\n` +
        `Ism: ${client.full_name}\n` +
        `Telefon: ${client.phone_number}\n` +
        `Telegram: ${client.tg_username ? `@${client.tg_username}` : 'Yo\'q'}\n` +
        `Ro'yxatdan o'tgan sana: ${client.created_at.toLocaleDateString('uz-UZ')}`,
      { reply_markup: menu },
    );
  }
}

