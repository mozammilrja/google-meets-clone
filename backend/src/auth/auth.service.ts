import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { hashPassword, verifyPassword } from '../common/utils/password';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService
  ) {}

  async register(dto: RegisterDto, req: Request) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      roles: ['member']
    });

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      roles: user.roles
    });

    await this.auditService.log({
      action: 'auth.register',
      resource: 'users',
      resourceId: user.id,
      actorId: user.id,
      actorIP: req.ip || 'unknown',
      actorUserAgent: req.headers['user-agent'] || 'unknown'
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token,
      expiresIn: this.jwtService.decode(token)?.['exp']
    };
  }

  async login(dto: LoginDto, req: Request) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      roles: user.roles
    });

    await this.auditService.log({
      action: 'auth.login',
      resource: 'users',
      resourceId: user.id,
      actorId: user.id,
      actorIP: req.ip || 'unknown',
      actorUserAgent: req.headers['user-agent'] || 'unknown'
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token,
      expiresIn: this.jwtService.decode(token)?.['exp']
    };
  }
}
