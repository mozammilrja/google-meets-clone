"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalingModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const signaling_gateway_1 = require("./signaling.gateway");
const signaling_service_1 = require("./signaling.service");
const audit_module_1 = require("../audit/audit.module");
const redis_module_1 = require("../redis/redis.module");
const meetings_module_1 = require("../meetings/meetings.module");
let SignalingModule = class SignalingModule {
};
exports.SignalingModule = SignalingModule;
exports.SignalingModule = SignalingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            audit_module_1.AuditModule,
            redis_module_1.RedisModule,
            meetings_module_1.MeetingsModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    secret: configService.get('JWT_SECRET') || 'your-secret-key',
                    signOptions: {
                        expiresIn: '24h',
                    },
                }),
            }),
        ],
        providers: [signaling_gateway_1.SignalingGateway, signaling_service_1.SignalingService],
        exports: [signaling_service_1.SignalingService],
    })
], SignalingModule);
//# sourceMappingURL=signaling.module.js.map