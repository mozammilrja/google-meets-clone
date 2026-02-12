"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
const password_1 = require("../common/utils/password");
const audit_service_1 = require("../audit/audit.service");
let AuthService = class AuthService {
    constructor(usersService, jwtService, auditService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.auditService = auditService;
    }
    async register(dto, req) {
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing) {
            throw new common_1.ConflictException('Email already registered');
        }
        const passwordHash = await (0, password_1.hashPassword)(dto.password);
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
    async login(dto, req) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const valid = await (0, password_1.verifyPassword)(dto.password, user.passwordHash);
        if (!valid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        audit_service_1.AuditService])
], AuthService);
//# sourceMappingURL=auth.service.js.map