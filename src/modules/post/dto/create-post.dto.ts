import { IsString, IsNotEmpty, IsUrl, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiPropertyOptional({ 
    description: 'Post rasmi URL (ixtiyoriy)', 
    example: 'https://example.com/image.jpg' 
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  image_url?: string;

  @ApiPropertyOptional({ 
    description: 'Post sarlavhasi (ixtiyoriy)', 
    example: 'Yangi xizmatlar' 
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ 
    description: 'Post tavsifi (talab qilinadi)', 
    example: 'Biz yangi xizmatlar qo\'shdik!' 
  })
  @IsString()
  @IsNotEmpty({ message: 'Post tavsifi talab qilinadi' })
  description: string;
}

