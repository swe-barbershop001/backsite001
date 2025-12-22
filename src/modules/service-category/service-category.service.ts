import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceCategory } from './entities/service-category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class ServiceCategoryService {
  constructor(
    @InjectRepository(ServiceCategory)
    private categoryRepository: Repository<ServiceCategory>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<ServiceCategory> {
    // Tekshirish - bir xil nomli kategoriya mavjudmi
    const existing = await this.categoryRepository.findOne({
      where: { name: createCategoryDto.name },
    });

    if (existing) {
      throw new ConflictException(`"${createCategoryDto.name}" nomli kategoriya allaqachon mavjud`);
    }

    const category = this.categoryRepository.create(createCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async findAll(): Promise<ServiceCategory[]> {
    return await this.categoryRepository.find({
      relations: ['services'],
      order: { created_at: 'ASC' },
    });
  }

  async findOne(id: number): Promise<ServiceCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['services'],
    });

    if (!category) {
      throw new NotFoundException(`ID ${id} bilan kategoriya topilmadi`);
    }

    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<ServiceCategory> {
    if (!id || isNaN(id)) {
      throw new BadRequestException("Noto'g'ri ID format");
    }

    // Kategoriya mavjudligini tekshirish
    const category = await this.findOne(id);

    // Agar nom o'zgartirilsa, bir xil nomli boshqa kategoriya yo'qligini tekshirish
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existing = await this.categoryRepository.findOne({
        where: { name: updateCategoryDto.name },
      });

      if (existing) {
        throw new ConflictException(`"${updateCategoryDto.name}" nomli kategoriya allaqachon mavjud`);
      }
    }

    // Yangilanishni amalga oshirish
    await this.categoryRepository.update(id, updateCategoryDto);

    // Yangilangan kategoriyani qaytarish
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    if (!id || isNaN(id)) {
      throw new BadRequestException("Noto'g'ri ID format");
    }

    // Kategoriya mavjudligini va service'lari borligini tekshirish
    const category = await this.findOne(id);

    if (category.services && category.services.length > 0) {
      throw new BadRequestException(
        `Bu kategoriyada ${category.services.length} ta xizmat mavjud. Avval xizmatlarni boshqa kategoriyaga o'tkazing yoki o'chiring.`
      );
    }

    // O'chirish
    const result = await this.categoryRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`ID ${id} bilan kategoriya o'chirilmadi`);
    }
  }
}

