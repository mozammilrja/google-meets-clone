"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const auth_module_1 = require("../auth/auth.module");
const audit_module_1 = require("../audit/audit.module");
const meetings_controller_1 = require("./meetings.controller");
const meetings_service_1 = require("./meetings.service");
const meeting_schema_1 = require("./schemas/meeting.schema");
const participant_schema_1 = require("./schemas/participant.schema");
const chat_message_schema_1 = require("./schemas/chat-message.schema");
const chat_service_1 = require("./services/chat.service");
let MeetingsModule = class MeetingsModule {
};
exports.MeetingsModule = MeetingsModule;
exports.MeetingsModule = MeetingsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: meeting_schema_1.Meeting.name, schema: meeting_schema_1.MeetingSchema },
                { name: participant_schema_1.Participant.name, schema: participant_schema_1.ParticipantSchema },
                { name: chat_message_schema_1.ChatMessage.name, schema: chat_message_schema_1.ChatMessageSchema }
            ]),
            auth_module_1.AuthModule,
            audit_module_1.AuditModule
        ],
        controllers: [meetings_controller_1.MeetingsController],
        providers: [meetings_service_1.MeetingsService, chat_service_1.ChatService],
        exports: [chat_service_1.ChatService]
    })
], MeetingsModule);
//# sourceMappingURL=meetings.module.js.map