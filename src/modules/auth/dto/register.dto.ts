import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, IsEnum } from 'class-validator';
import { UserRole } from 'src/common/enums/user.enum';

export class RegisterDto {
  @ApiProperty({
    type: 'string',
    description: 'Full name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    type: 'string',
    description: 'Telegram username',
    example: 'john_doe',
  })
  @IsString()
  @IsNotEmpty()
  tg_username: string;

  @ApiProperty({
    type: 'string',
    description: 'Phone number',
    example: '+998901234567',
  })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({
    type: 'string',
    description: 'Password (minimum 4 characters)',
    example: 'pass',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(4, { message: "Parol kamida 4 belgidan iborat bo'lishi kerak" })
  password: string;

  @ApiProperty({
    enum: UserRole,
    description: 'User role - only admin or super_admin allowed',
    example: UserRole.ADMIN,
  })
  @IsEnum(UserRole, { message: 'Role faqat admin yoki super_admin bo\'lishi kerak' })
  @IsNotEmpty()
  role: UserRole;
}
