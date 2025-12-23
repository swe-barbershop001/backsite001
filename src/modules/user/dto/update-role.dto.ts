import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../../common/enums/user.enum';

export class UpdateRoleDto {
  @ApiProperty({
    enum: UserRole,
    description: 'Yangi foydalanuvchi roli',
    example: UserRole.BARBER,
    enumName: 'UserRole',
  })
  @IsEnum(UserRole, {
    message:
      "Role qiymati admin, barber, client yoki super_admin bo'lishi kerak",
  })
  @IsNotEmpty({ message: "Role maydoni bo'sh bo'lmasligi kerak" })
  role: UserRole;
}
