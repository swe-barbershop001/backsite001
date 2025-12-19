import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { AuthGuard, RoleGuard } from '../../common/guards';
import { UserRole } from '../../common/enums/user.enum';
import { Role } from '../../common/decorators';
import { TokenPayload } from '../../modules/auth/auth.service';

@Controller('client')
@ApiTags('Client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Yangi client (mijoz) yaratish',
    description:
      'Faqat ADMIN yoki SUPER_ADMIN yangi client yarata oladi. Client yaratish uchun faqat ism va telefon raqami talab qilinadi.',
  })
  @ApiBody({
    type: CreateClientDto,
    description: 'Client ma\'lumotlari (JSON formatida)',
  })
  @ApiResponse({
    status: 201,
    description: 'Client muvaffaqiyatli yaratildi',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1, description: 'Client ID' },
        name: { type: 'string', example: 'Ali Valiyev', description: 'Client ismi' },
        phone_number: { type: 'string', example: '+998901234567', description: 'Telefon raqami' },
        tg_id: { type: 'string', nullable: true, example: '123456789', description: 'Telegram ID' },
        tg_username: { type: 'string', nullable: true, example: 'ali_client', description: 'Telegram username' },
        role: { type: 'string', enum: ['client'], example: 'client', description: 'Foydalanuvchi roli' },
        created_at: { type: 'string', format: 'date-time', example: '2025-01-25T10:00:00.000Z', description: 'Yaratilgan sana' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Noto'g'ri so'rov - talab qilinadigan maydonlar to'ldirilmagan yoki noto'g'ri format",
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Ism talab qilinadi' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Autentifikatsiya talab qilinadi - Token yuborilmagan yoki noto\'g\'ri',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Taqiqlangan - Faqat ADMIN yoki SUPER_ADMIN yangi client yarata oladi',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Faqat ADMIN yoki SUPER_ADMIN yangi mijoz yarata oladi' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Telefon raqam, telegram ID yoki telegram username allaqachon mavjud',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Bu telefon raqam allaqachon mavjud' },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createClientDto: CreateClientDto,
    @Request() req: ExpressRequest & { user: TokenPayload },
  ) {
    // Bo'sh string'larni undefined qilish
    if (createClientDto.tg_username === '') {
      createClientDto.tg_username = undefined;
    }
    if (createClientDto.tg_id === '') {
      createClientDto.tg_id = undefined;
    }

    return this.clientService.createClient(createClientDto, req.user);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Barcha clientlar ro\'yxatini olish',
    description: 'Faqat ADMIN, SUPER_ADMIN yoki BARBER barcha clientlar ro\'yxatini ko\'ra oladi.',
  })
  @ApiResponse({
    status: 200,
    description: 'Barcha clientlar ro\'yxati',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1, description: 'Client ID' },
          name: { type: 'string', example: 'Ali Valiyev', description: 'Client ismi' },
          phone_number: { type: 'string', nullable: true, example: '+998901234567', description: 'Telefon raqami' },
          tg_id: { type: 'string', nullable: true, example: '123456789', description: 'Telegram ID' },
          tg_username: { type: 'string', nullable: true, example: 'ali_client', description: 'Telegram username' },
          role: { type: 'string', enum: ['client'], example: 'client', description: 'Foydalanuvchi roli' },
          profile_image: { type: 'string', nullable: true, example: '/uploads/profiles/client-123.jpg', description: 'Profile rasm yo\'li' },
          created_at: { type: 'string', format: 'date-time', example: '2025-01-25T10:00:00.000Z', description: 'Yaratilgan sana' },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Autentifikatsiya talab qilinadi - Token yuborilmagan yoki noto\'g\'ri',
  })
  @ApiResponse({
    status: 403,
    description: 'Taqiqlangan - Faqat ADMIN, SUPER_ADMIN yoki BARBER barcha clientlar ro\'yxatini ko\'ra oladi',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.BARBER)
  findAll() {
    return this.clientService.findAllClients();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Client ID bo\'yicha olish',
    description: 'Faqat ADMIN, SUPER_ADMIN yoki BARBER client ma\'lumotlarini ko\'ra oladi.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Client ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Client topildi',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1, description: 'Client ID' },
        name: { type: 'string', example: 'Ali Valiyev', description: 'Client ismi' },
        phone_number: { type: 'string', nullable: true, example: '+998901234567', description: 'Telefon raqami' },
        tg_id: { type: 'string', nullable: true, example: '123456789', description: 'Telegram ID' },
        tg_username: { type: 'string', nullable: true, example: 'ali_client', description: 'Telegram username' },
        role: { type: 'string', enum: ['client'], example: 'client', description: 'Foydalanuvchi roli' },
        created_at: { type: 'string', format: 'date-time', example: '2025-01-25T10:00:00.000Z', description: 'Yaratilgan sana' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Noto'g'ri ID format",
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Noto\'g\'ri ID format' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Autentifikatsiya talab qilinadi - Token yuborilmagan yoki noto\'g\'ri',
  })
  @ApiResponse({
    status: 403,
    description: 'Taqiqlangan - Faqat ADMIN, SUPER_ADMIN yoki BARBER client ma\'lumotlarini ko\'ra oladi',
  })
  @ApiResponse({
    status: 404,
    description: 'Client topilmadi',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'ID 1 bilan client topilmadi' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.BARBER)
  findOne(@Param('id') id: string) {
    return this.clientService.findClientById(+id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Client ma\'lumotlarini yangilash',
    description:
      'ADMIN, SUPER_ADMIN yoki BARBER client ma\'lumotlarini yangilay oladi.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Client ID', example: 1 })
  @ApiBody({
    type: UpdateClientDto,
    description: 'Client ma\'lumotlari (JSON formatida)',
  })
  @ApiResponse({
    status: 200,
    description: 'Client muvaffaqiyatli yangilandi',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1, description: 'Client ID' },
        name: { type: 'string', example: 'Ali Valiyev', description: 'Client ismi' },
        phone_number: { type: 'string', nullable: true, example: '+998901234567', description: 'Telefon raqami' },
        tg_id: { type: 'string', nullable: true, example: '123456789', description: 'Telegram ID' },
        tg_username: { type: 'string', nullable: true, example: 'ali_client', description: 'Telegram username' },
        role: { type: 'string', enum: ['client'], example: 'client', description: 'Foydalanuvchi roli' },
        created_at: { type: 'string', format: 'date-time', example: '2025-01-25T10:00:00.000Z', description: 'Yaratilgan sana' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Noto'g'ri so'rov - talab qilinadigan maydonlar to'ldirilmagan yoki noto'g'ri format",
  })
  @ApiResponse({
    status: 401,
    description: 'Autentifikatsiya talab qilinadi - Token yuborilmagan yoki noto\'g\'ri',
  })
  @ApiResponse({
    status: 403,
    description: 'Taqiqlangan - Faqat ADMIN, SUPER_ADMIN yoki BARBER client ma\'lumotlarini yangilay oladi',
  })
  @ApiResponse({
    status: 404,
    description: 'Client topilmadi',
  })
  @ApiResponse({
    status: 409,
    description: 'Telefon raqam, telegram ID yoki telegram username allaqachon mavjud',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.BARBER)
  async update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
    @Request() req: ExpressRequest & { user: TokenPayload },
  ) {
    // Bo'sh string'larni undefined qilish
    if (updateClientDto.tg_username === '') {
      updateClientDto.tg_username = undefined;
    }
    if (updateClientDto.tg_id === '') {
      updateClientDto.tg_id = undefined;
    }
    if (updateClientDto.phone_number === '') {
      updateClientDto.phone_number = undefined;
    }
    if (updateClientDto.name === '') {
      updateClientDto.name = undefined;
    }

    return this.clientService.updateClient(+id, updateClientDto, req.user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clientni o\'chirish',
    description: 'ADMIN, SUPER_ADMIN yoki BARBER clientni o\'chira oladi.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Client ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Client muvaffaqiyatli o\'chirildi',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Client muvaffaqiyatli o\'chirildi' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Noto'g'ri ID format",
  })
  @ApiResponse({
    status: 401,
    description: 'Autentifikatsiya talab qilinadi - Token yuborilmagan yoki noto\'g\'ri',
  })
  @ApiResponse({
    status: 403,
    description: 'Taqiqlangan - Faqat ADMIN, SUPER_ADMIN yoki BARBER clientni o\'chira oladi',
  })
  @ApiResponse({
    status: 404,
    description: 'Client topilmadi',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Role(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.BARBER)
  async remove(@Param('id') id: string, @Request() req: ExpressRequest & { user: TokenPayload }) {
    await this.clientService.removeClient(+id, req.user);
    return { message: 'Client muvaffaqiyatli o\'chirildi' };
  }
}

