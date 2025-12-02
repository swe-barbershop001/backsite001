import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    type: 'string',
    description: 'Telegram foydalanuvchi nomi',
    example: 'john_doe',
  })
  @IsString()
  @IsNotEmpty()
  tg_username: string;

  @ApiProperty({ type: 'string', description: 'Parol', example: 'password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
