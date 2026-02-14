"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const meetings_module_1 = require("./meetings/meetings.module");
const audit_module_1 = require("./audit/audit.module");
const signaling_module_1 = require("./signaling/signaling.module");
const redis_module_1 = require("./redis/redis.module");
const health_controller_1 = require("./common/health.controller");
const graceful_shutdown_service_1 = require("./common/graceful-shutdown.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            mongoose_1.MongooseModule.forRoot(process.env.MONGODB_URI || ''),
            redis_module_1.RedisModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            meetings_module_1.MeetingsModule,
            audit_module_1.AuditModule,
            signaling_module_1.SignalingModule,
        ],
        controllers: [health_controller_1.HealthController],
        providers: [graceful_shutdown_service_1.GracefulShutdownService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map