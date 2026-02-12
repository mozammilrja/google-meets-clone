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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const chat_message_schema_1 = require("../schemas/chat-message.schema");
let ChatService = ChatService_1 = class ChatService {
    constructor(chatMessageModel) {
        this.chatMessageModel = chatMessageModel;
        this.logger = new common_1.Logger(ChatService_1.name);
    }
    async saveMessage(meetingId, participantId, participantName, message) {
        try {
            const newMessage = new this.chatMessageModel({
                meetingId: new mongoose_2.Types.ObjectId(meetingId),
                participantId,
                participantName,
                message,
                timestamp: new Date(),
            });
            const savedMessage = await newMessage.save();
            this.logger.log(`Chat message saved for meeting ${meetingId} by participant ${participantId}`);
            return savedMessage;
        }
        catch (error) {
            this.logger.error('Failed to save chat message:', error);
            throw error;
        }
    }
    async getMessageHistory(meetingId, limit = 50) {
        try {
            const messages = await this.chatMessageModel
                .find({ meetingId: new mongoose_2.Types.ObjectId(meetingId) })
                .sort({ timestamp: -1 })
                .limit(limit)
                .lean();
            return messages;
        }
        catch (error) {
            this.logger.error('Failed to retrieve chat message history:', error);
            throw error;
        }
    }
    async deleteMessagesByMeeting(meetingId) {
        try {
            await this.chatMessageModel.deleteMany({ meetingId: new mongoose_2.Types.ObjectId(meetingId) });
            this.logger.log(`Chat messages deleted for meeting ${meetingId}`);
        }
        catch (error) {
            this.logger.error('Failed to delete chat messages:', error);
            throw error;
        }
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(chat_message_schema_1.ChatMessage.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ChatService);
//# sourceMappingURL=chat.service.js.map