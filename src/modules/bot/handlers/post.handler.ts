import { Context, InlineKeyboard } from 'grammy';
import { UserService } from '../../user/user.service';
import { PostService } from '../../post/post.service';
import { UserRole } from '../../../common/enums/user.enum';
import { getAdminMainMenu } from '../keyboards/main.menu';

interface PostCreationState {
  step: 'waiting_image' | 'waiting_title' | 'waiting_description' | 'ready';
  imageUrl?: string;
  title?: string;
  description?: string;
  skipImage?: boolean;
  skipTitle?: boolean;
}

export class PostHandler {
  private postStates = new Map<number, PostCreationState>();

  constructor(
    private userService: UserService,
    private postService: PostService,
  ) {}

  /**
   * Post yaratishni boshlash
   */
  async handlePostCreation(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return ctx.reply('Siz admin emassiz.');
    }

    // Post yaratish holatini boshlash
    this.postStates.set(ctx.from.id, {
      step: 'waiting_image',
      skipImage: false,
      skipTitle: false,
    });

    const message = `
<b>📢 Post yuborish</b>

━━━━━━━━━━━━━━━━━━

Post yuborish uchun quyidagi qadamlarni bajaring:

1️⃣ <b>Rasm yuborish</b> - Post uchun rasm yuboring (rasm yoki URL) yoki "O'tkazib yuborish" tugmasini bosing

Iltimos, post uchun rasm yuboring yoki "O'tkazib yuborish" tugmasini bosing:
`;

    const keyboard = new InlineKeyboard()
      .text('⏭️ O\'tkazib yuborish', 'skip_image')
      .row()
      .text('❌ Bekor qilish', 'cancel_post');

    return ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  }

  /**
   * Rasm qabul qilish
   */
  async handlePhoto(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return;
    }

    const state = this.postStates.get(ctx.from.id);
    if (!state || state.step !== 'waiting_image') {
      return;
    }

    // Rasm URL ni olish
    let imageUrl: string | undefined;

    if (ctx.message?.photo && ctx.message.photo.length > 0) {
      // Agar rasm yuborilgan bo'lsa, eng katta rasmni olish
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      if (photo?.file_id) {
        // Bot API orqali file path ni olish
        try {
          const file = await ctx.api.getFile(photo.file_id);
          const botToken = process.env.BOT_TOKEN;
          if (!botToken) {
            return ctx.reply('Bot token topilmadi. Iltimos, qayta urinib ko\'ring.');
          }
          imageUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
        } catch (error) {
          console.error('Error getting file:', error);
          return ctx.reply('Rasm yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
        }
      }
    } else if (ctx.message?.text) {
      // Agar text yuborilgan bo'lsa, URL deb qabul qilamiz
      const text = ctx.message.text.trim();
      if (this.isValidUrl(text)) {
        imageUrl = text;
      } else {
        return ctx.reply('Iltimos, to\'g\'ri rasm URL yuboring yoki rasm yuboring.');
      }
    } else {
      return ctx.reply('Iltimos, rasm yoki rasm URL yuboring.');
    }

    // State ni yangilash
    state.imageUrl = imageUrl;
    state.step = 'waiting_title';

    const message = `
✅ <b>Rasm qabul qilindi!</b>

━━━━━━━━━━━━━━━━━━

2️⃣ <b>Post sarlavhasi</b> - Post uchun sarlavha kiriting (ixtiyoriy) yoki "O'tkazib yuborish" tugmasini bosing

Iltimos, post sarlavhasini kiriting yoki "O'tkazib yuborish" tugmasini bosing:
`;

    const keyboard = new InlineKeyboard()
      .text('⏭️ O\'tkazib yuborish', 'skip_title')
      .row()
      .text('❌ Bekor qilish', 'cancel_post');

    return ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  }

  /**
   * Title qabul qilish
   */
  async handleTitle(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return;
    }

    const state = this.postStates.get(ctx.from.id);
    if (!state || state.step !== 'waiting_title') {
      return;
    }

    if (!ctx.message?.text || ctx.message.text.trim().length === 0) {
      return ctx.reply('Iltimos, post sarlavhasini kiriting.');
    }

    const title = ctx.message.text.trim();

    // State ni yangilash
    state.title = title;
    state.step = 'waiting_description';

    const message = `
✅ <b>Sarlavha qabul qilindi!</b>

━━━━━━━━━━━━━━━━━━

3️⃣ <b>Post tavsifi</b> - Post uchun tavsif kiriting (talab qilinadi)

Iltimos, post tavsifini kiriting:
`;

    const keyboard = new InlineKeyboard().text('❌ Bekor qilish', 'cancel_post');

    return ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  }

  /**
   * Description qabul qilish va post yuborish
   */
  async handleDescription(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return;
    }

    const state = this.postStates.get(ctx.from.id);
    if (!state || state.step !== 'waiting_description') {
      return;
    }

    if (!ctx.message?.text || ctx.message.text.trim().length === 0) {
      return ctx.reply('Iltimos, post tavsifini kiriting.');
    }

    const description = ctx.message.text.trim();

    // State ni yangilash
    state.description = description;
    state.step = 'ready';

    // Post preview ko'rsatish
    let previewMessage = `
<b>📢 Post ko'rinishi</b>

━━━━━━━━━━━━━━━━━━
`;

    if (state.title) {
      previewMessage += `<b>Sarlavha:</b> ${state.title}\n\n`;
    }
    
    previewMessage += `<b>Tavsif:</b> ${description}\n\n`;
    previewMessage += `━━━━━━━━━━━━━━━━━━\n\n`;
    previewMessage += `Post yuborishni tasdiqlaysizmi?`;

    const keyboard = new InlineKeyboard()
      .text('✅ Yuborish', 'confirm_post')
      .text('❌ Bekor qilish', 'cancel_post')
      .row();

    return ctx.reply(previewMessage, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  }

  /**
   * Post yuborishni tasdiqlash
   */
  async handleConfirmPost(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return ctx.reply('Siz admin emassiz.');
    }

    const state = this.postStates.get(ctx.from.id);
    if (!state || state.step !== 'ready' || !state.description) {
      return ctx.reply('Post tavsifi talab qilinadi. Iltimos, qayta boshlang.');
    }

    try {
      // Post yuborish
      const result = await this.postService.broadcastPostToAllClients({
        image_url: state.imageUrl,
        title: state.title,
        description: state.description,
      });

      // State ni tozalash
      this.postStates.delete(ctx.from.id);

      const successMessage = `
✅ <b>Post muvaffaqiyatli yuborildi!</b>

━━━━━━━━━━━━━━━━━━

📊 <b>Statistika:</b>
👥 <b>Jami clientlar:</b> ${result.totalClients}
✅ <b>Yuborildi:</b> ${result.sentCount}
❌ <b>Xatolik:</b> ${result.failedCount}

━━━━━━━━━━━━━━━━━━
`;

      const menu = getAdminMainMenu();

      return ctx.reply(successMessage, {
        reply_markup: menu,
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.error('Error sending post:', error);
      if (ctx.from) {
        this.postStates.delete(ctx.from.id);
      }
      const menu = getAdminMainMenu();
      return ctx.reply('Post yuborishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.', {
        reply_markup: menu,
      });
    }
  }

  /**
   * Rasmni o'tkazib yuborish
   */
  async handleSkipImage(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return;
    }

    const state = this.postStates.get(ctx.from.id);
    if (!state || state.step !== 'waiting_image') {
      return;
    }

    // State ni yangilash
    state.skipImage = true;
    state.step = 'waiting_title';

    const message = `
⏭️ <b>Rasm o'tkazib yuborildi</b>

━━━━━━━━━━━━━━━━━━

2️⃣ <b>Post sarlavhasi</b> - Post uchun sarlavha kiriting (ixtiyoriy) yoki "O'tkazib yuborish" tugmasini bosing

Iltimos, post sarlavhasini kiriting yoki "O'tkazib yuborish" tugmasini bosing:
`;

    const keyboard = new InlineKeyboard()
      .text('⏭️ O\'tkazib yuborish', 'skip_title')
      .row()
      .text('❌ Bekor qilish', 'cancel_post');

    return ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  }

  /**
   * Sarlavhani o'tkazib yuborish
   */
  async handleSkipTitle(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return;
    }

    const state = this.postStates.get(ctx.from.id);
    if (!state || state.step !== 'waiting_title') {
      return;
    }

    // State ni yangilash
    state.skipTitle = true;
    state.step = 'waiting_description';

    const message = `
⏭️ <b>Sarlavha o'tkazib yuborildi</b>

━━━━━━━━━━━━━━━━━━

3️⃣ <b>Post tavsifi</b> - Post uchun tavsif kiriting (talab qilinadi)

Iltimos, post tavsifini kiriting:
`;

    const keyboard = new InlineKeyboard().text('❌ Bekor qilish', 'cancel_post');

    return ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  }

  /**
   * Post yaratishni bekor qilish
   */
  async handleCancelPost(ctx: Context) {
    const tgId = ctx.from?.id.toString();
    if (!tgId || !ctx.from) return;

    const user = await this.userService.findByTgId(tgId);
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
      return;
    }

    // State ni tozalash
    this.postStates.delete(ctx.from.id);

    const menu = getAdminMainMenu();

    return ctx.reply('Post yaratish bekor qilindi.', {
      reply_markup: menu,
    });
  }

  /**
   * URL tekshirish
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * User'ning post yaratish holatini olish
   */
  getPostState(userId: number): PostCreationState | undefined {
    return this.postStates.get(userId);
  }
}

