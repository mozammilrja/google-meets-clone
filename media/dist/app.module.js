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
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const room_service_1 = require("./services/room.service");
const mediasoup_gateway_1 = require("./mediasoup/mediasoup.gateway");
const auth_service_1 = require("./services/auth.service");
const recording_service_1 = require("./services/recording.service");
const logger_1 = require("./utils/logger");
let AppModule = class AppModule {
    constructor(recordingService) {
        this.recordingService = recordingService;
    }
    async onModuleInit() {
        await this.recordingService.ensureRecordingDirectory();
        logger_1.logger.info('Media server initialized');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        controllers: [app_controller_1.AppController],
        providers: [
            room_service_1.RoomService,
            mediasoup_gateway_1.MediasoupGateway,
            auth_service_1.AuthService,
            recording_service_1.RecordingService,
        ],
    }),
    __metadata("design:paramtypes", [recording_service_1.RecordingService])
], AppModule);
//# sourceMappingURL=app.module.js.map