import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "src/modules/auth/auth.service";

@Injectable()
export class AuthGuard implements CanActivate{
    constructor(private readonly authService: AuthService) {}
    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Token topilmadi');
        }
        
        const token = authHeader.split(' ')[1];

        if (!token) {
            throw new UnauthorizedException('Token topilmadi');
        }

        try {
            const decoded = await this.authService.verifyToken(token);
            if (!decoded) {
                throw new UnauthorizedException('Token noto\'g\'ri yoki muddati o\'tgan');
            }
            
            request.user = decoded;
            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Token noto\'g\'ri yoki muddati o\'tgan');
        }
    }
}
