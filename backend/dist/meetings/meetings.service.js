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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const audit_service_1 = require("../audit/audit.service");
const meeting_schema_1 = require("./schemas/meeting.schema");
const participant_schema_1 = require("./schemas/participant.schema");
let MeetingsService = class MeetingsService {
    constructor(meetingModel, participantModel, auditService) {
        this.meetingModel = meetingModel;
        this.participantModel = participantModel;
        this.auditService = auditService;
    }
    async createMeeting(dto, userId, reqMeta) {
        const code = this.generateMeetingCode();
        const meeting = await this.meetingModel.create({
            title: dto.title,
            code,
            hostId: userId,
            scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
            duration: dto.duration,
            status: 'scheduled',
            settings: dto.settings || {}
        });
        await this.auditService.log({
            actorId: userId,
            actorIP: reqMeta.ip,
            actorUserAgent: reqMeta.userAgent,
            action: 'meeting.created',
            resource: 'meetings',
            resourceId: meeting.id,
            metadata: { code }
        });
        return meeting;
    }
    async getMeetingById(meetingId) {
        const meeting = await this.meetingModel.findById(meetingId).exec();
        if (!meeting) {
            throw new common_1.NotFoundException('Meeting not found');
        }
        return meeting;
    }
    async getMeetingByCode(code) {
        const normalizedCode = code.toLowerCase().replace(/-/g, '');
        const meetings = await this.meetingModel.find().exec();
        const meeting = meetings.find(m => m.code.toLowerCase().replace(/-/g, '') === normalizedCode);
        if (!meeting) {
            throw new common_1.NotFoundException('Meeting not found');
        }
        return {
            id: meeting.id,
            code: meeting.code,
            title: meeting.title,
            hostId: meeting.hostId,
            status: meeting.status,
        };
    }
    async joinMeeting(meetingId, dto, userId, reqMeta) {
        const meeting = await this.meetingModel.findById(meetingId).exec();
        if (!meeting) {
            throw new common_1.NotFoundException('Meeting not found');
        }
        const participant = await this.participantModel.create({
            meetingId,
            userId,
            name: dto.name,
            role: 'participant',
            status: 'connected',
            audio: dto.audio ?? true,
            video: dto.video ?? true,
            screenSharing: false,
            joinedAt: new Date()
        });
        await this.auditService.log({
            actorId: userId,
            actorIP: reqMeta.ip,
            actorUserAgent: reqMeta.userAgent,
            action: 'meeting.joined',
            resource: 'participants',
            resourceId: participant.id,
            metadata: { meetingId }
        });
        return {
            meetingId,
            participantId: participant.id,
            role: participant.role
        };
    }
    async leaveMeeting(meetingId, participantId, userId, reqMeta) {
        const participant = await this.participantModel.findOne({
            _id: participantId,
            meetingId
        });
        if (!participant) {
            throw new common_1.NotFoundException('Participant not found');
        }
        participant.status = 'left';
        participant.leftAt = new Date();
        await participant.save();
        await this.auditService.log({
            actorId: userId,
            actorIP: reqMeta.ip,
            actorUserAgent: reqMeta.userAgent,
            action: 'meeting.left',
            resource: 'participants',
            resourceId: participant.id,
            metadata: { meetingId }
        });
        return { success: true };
    }
    generateMeetingCode() {
        const part = () => Math.random().toString(36).substring(2, 6);
        return `${part()}-${part()}-${part()}`;
    }
};
exports.MeetingsService = MeetingsService;
exports.MeetingsService = MeetingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(meeting_schema_1.Meeting.name)),
    __param(1, (0, mongoose_1.InjectModel)(participant_schema_1.Participant.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        audit_service_1.AuditService])
], MeetingsService);
//# sourceMappingURL=meetings.service.js.map