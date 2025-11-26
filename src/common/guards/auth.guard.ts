import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "src/modules/auth/auth.service";

@Injectable()
export class AuthGuard implements CanActivate{
    constructor(private readonly authService: AuthService) {}
    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const token = request.headers.authorization?.split(' ')[1];

        if (!token) {
            throw new UnauthorizedException('Token topilmadi');
        }

        const decoded = await this.authService.verifyToken(token);
        if (!decoded) {
            throw new UnauthorizedException('Token noto\'g\'ri');
        }
        
        request.user = decoded;
        return true;
    }
}
