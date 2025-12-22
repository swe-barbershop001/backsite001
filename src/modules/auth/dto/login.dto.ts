import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    type: 'string',
    description: 'Telegram foydalanuvchi nomi',
    example: 'super_admin',
  })
  @IsString()
  @IsNotEmpty()
  tg_username: string;

  @ApiProperty({ type: 'string', description: 'Parol', example: 'admin123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
