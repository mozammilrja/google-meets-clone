import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto, req: Request): Promise<{
        user: {
            id: any;
            email: string;
            name: string;
        };
        token: string;
        expiresIn: any;
    }>;
    login(dto: LoginDto, req: Request): Promise<{
        user: {
            id: any;
            email: string;
            name: string;
        };
        token: string;
        expiresIn: any;
    }>;
}
