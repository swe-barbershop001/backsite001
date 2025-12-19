import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { AuthGuard, RoleGuard } from '../../common/guards';
import { Role } from '../../common/decorators';
import { UserRole } from '../../common/enums/user.enum';

@Controller('posts')
@ApiTags('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post('broadcast')
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/posts',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `post-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Faqat rasm fayllari qabul qilish
        if (file.mimetype && file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Faqat rasm fayllari qabul qilinadi'), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Post rasmi (yuklash, ixtiyoriy)',
        },
        image_url: {
          type: 'string',
          description: 'Post rasmi URL (ixtiyoriy)',
          example: 'https://example.com/image.jpg',
        },
        title: {
          type: 'string',
          description: 'Post sarlavhasi (ixtiyoriy)',
          example: 'Yangi xizmatlar',
        },
        description: {
          type: 'string',
          description: 'Post tavsifi (talab qilinadi)',
          example: 'Biz yangi xizmatlar qo\'shdik!',
        },
      },
      required: ['description'],
    },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Barcha clientlarga post yuborish (Faqat admin uchun)',
    description:
      'Botga start bosgan barcha clientlarga post yuboradi. Tavsif talab qilinadi, rasm va sarlavha ixtiyoriy. Rasm yuklash yoki URL berish mumkin.',
  })
  @ApiResponse({
    status: 200,
    description: 'Post muvaffaqiyatli yuborildi',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        totalClients: { type: 'number' },
        sentCount: { type: 'number' },
        failedCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Noto'g'ri so'rov - post tavsifi talab qilinadi",
  })
  @ApiResponse({
    status: 401,
    description: 'Autentifikatsiya talab qilinadi',
  })
  @ApiResponse({
    status: 403,
    description: 'Faqat admin yoki super admin uchun',
  })
  async broadcastPost(
    @Body() createPostDto: CreatePostDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
        ],
      }),
    )
    file?: Express.Multer.File,
  ) {
    // Agar file yuborilgan bo'lsa, file path'ni URL'ga o'zgartirish
    if (file) {
      // Server URL'ni olish
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      createPostDto.image_url = `${baseUrl}/uploads/posts/${file.filename}`;
    }

    // Description talab qilinadi
    if (!createPostDto.description || createPostDto.description.trim().length === 0) {
      throw new BadRequestException(
        'Post tavsifi talab qilinadi.',
      );
    }

    // Bo'sh string'larni undefined qilish
    if (createPostDto.image_url === '') {
      createPostDto.image_url = undefined;
    }
    if (createPostDto.title === '') {
      createPostDto.title = undefined;
    }

    return await this.postService.broadcastPostToAllClients(createPostDto);
  }
}

