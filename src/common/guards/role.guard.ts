import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/user.enum';
import { Role } from '../decorators/role.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      // Agar role belgilanmagan bo'lsa, barcha foydalanuvchilar kirishi mumkin
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Foydalanuvchi ma'lumotlari topilmadi");
    }

    if (!requiredRoles.includes(user.role)) {
      const rolesString = requiredRoles.join(', ');
      throw new ForbiddenException(
        `Bu resursga kirish uchun quyidagi rollardan biri kerak: ${rolesString}`,
      );
    }

    return true;
  }
}
