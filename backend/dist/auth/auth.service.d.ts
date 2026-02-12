import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly auditService;
    constructor(usersService: UsersService, jwtService: JwtService, auditService: AuditService);
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
