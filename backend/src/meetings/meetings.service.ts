import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { JoinMeetingDto } from './dto/join-meeting.dto';
import { Meeting, MeetingDocument } from './schemas/meeting.schema';
import { Participant, ParticipantDocument } from './schemas/participant.schema';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectModel(Meeting.name) private readonly meetingModel: Model<MeetingDocument>,
    @InjectModel(Participant.name) private readonly participantModel: Model<ParticipantDocument>,
    private readonly auditService: AuditService
  ) {}

  async createMeeting(dto: CreateMeetingDto, userId: string, reqMeta: { ip: string; userAgent: string }) {
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

  async getMeetingById(meetingId: string) {
    const meeting = await this.meetingModel.findById(meetingId).exec();
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return meeting;
  }

  async getMeetingByCode(code: string) {
    // Normalize: lowercase and strip hyphens for comparison
    const normalizedCode = code.toLowerCase().replace(/-/g, '');
    
    // Find meeting where code matches after normalization
    const meetings = await this.meetingModel.find().exec();
    const meeting = meetings.find(m => 
      m.code.toLowerCase().replace(/-/g, '') === normalizedCode
    );
    
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return {
      id: meeting.id,
      code: meeting.code,
      title: meeting.title,
      hostId: meeting.hostId,
      status: meeting.status,
    };
  }

  async joinMeeting(
    meetingId: string,
    dto: JoinMeetingDto,
    userId: string,
    reqMeta: { ip: string; userAgent: string }
  ) {
    const meeting = await this.meetingModel.findById(meetingId).exec();
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
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

  async leaveMeeting(
    meetingId: string,
    participantId: string,
    userId: string,
    reqMeta: { ip: string; userAgent: string }
  ) {
    const participant = await this.participantModel.findOne({
      _id: participantId,
      meetingId
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
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

  private generateMeetingCode(): string {
    const part = () => Math.random().toString(36).substring(2, 6);
    return `${part()}-${part()}-${part()}`;
  }
}
