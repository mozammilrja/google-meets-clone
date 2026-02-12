"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediasoupModule = void 0;
const common_1 = require("@nestjs/common");
const room_service_1 = require("../services/room.service");
const mediasoup_gateway_1 = require("./mediasoup.gateway");
const auth_service_1 = require("../services/auth.service");
let MediasoupModule = class MediasoupModule {
};
exports.MediasoupModule = MediasoupModule;
exports.MediasoupModule = MediasoupModule = __decorate([
    (0, common_1.Module)({
        providers: [
            room_service_1.RoomService,
            mediasoup_gateway_1.MediasoupGateway,
            auth_service_1.AuthService,
        ],
        exports: [room_service_1.RoomService],
    })
], MediasoupModule);
//# sourceMappingURL=mediasoup.module.js.map