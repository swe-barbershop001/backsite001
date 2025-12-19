import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { BotService } from '../bot/bot.service';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostService {
  constructor(
    private userService: UserService,
    @Inject(forwardRef(() => BotService))
    private botService: BotService,
  ) {}

  /**
   * Barcha clientlarga (botga start bosgan barcha clientlar) post yuborish
   * @param createPostDto Post ma'lumotlari (image_url, title, description)
   */
  async broadcastPostToAllClients(createPostDto: CreatePostDto): Promise<{
    success: boolean;
    totalClients: number;
    sentCount: number;
    failedCount: number;
  }> {
    try {
      // Description talab qilinadi
      if (!createPostDto.description || createPostDto.description.trim().length === 0) {
        throw new Error('Post tavsifi talab qilinadi');
      }

      // Barcha clientlarni (tg_id bo'lganlar) olish
      const clients = await this.userService.findAllClientsWithTgId();
      const totalClients = clients.length;

      if (totalClients === 0) {
        return {
          success: true,
          totalClients: 0,
          sentCount: 0,
          failedCount: 0,
        };
      }

      // Post formatini yaratish
      const caption = this.formatPostMessage(createPostDto.title, createPostDto.description);

      let sentCount = 0;
      let failedCount = 0;

      // Har bir client'ga post yuborish
      for (const client of clients) {
        if (!client.tg_id) {
          failedCount++;
          continue;
        }

        try {
          // Agar image_url bo'lsa, rasm bilan yuborish
          if (createPostDto.image_url) {
            await this.botService.sendPhoto(
              client.tg_id,
              createPostDto.image_url,
              caption,
              {
                parse_mode: 'HTML',
              },
            );
          } else {
            // Agar image_url bo'lmasa, faqat text yuborish
            await this.botService.sendMessage(
              client.tg_id,
              caption,
              {
                parse_mode: 'HTML',
              },
            );
          }
          sentCount++;
        } catch (error: any) {
          failedCount++;
          console.error(
            `Failed to send post to client ${client.id} (tg_id: ${client.tg_id}):`,
            error?.message || error,
          );
        }
      }

      return {
        success: true,
        totalClients,
        sentCount,
        failedCount,
      };
    } catch (error) {
      console.error('Error broadcasting post to all clients:', error);
      throw error;
    }
  }

  /**
   * Post xabarini formatlash
   */
  private formatPostMessage(title?: string, description?: string): string {
    let message = '';
    
    if (title && title.trim().length > 0) {
      message += `📢 <b>${title}</b>\n\n`;
    }
    
    message += '━━━━━━━━━━━━━━━━━━\n\n';
    
    if (description) {
      message += `${description}\n\n`;
    }
    
    message += '━━━━━━━━━━━━━━━━━━';
    
    return message;
  }
}

