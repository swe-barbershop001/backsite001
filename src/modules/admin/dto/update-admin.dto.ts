import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAdminDto } from './create-admin.dto';

export class UpdateAdminDto extends PartialType(CreateAdminDto) {
  @ApiPropertyOptional({ 
    description: 'Profile rasm fayl yo\'li', 
    example: '/uploads/profiles/admin-123.jpg' 
  })
  @IsString()
  @IsOptional()
  profile_image?: string;
}

