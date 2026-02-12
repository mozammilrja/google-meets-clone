import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { JoinMeetingDto } from './dto/join-meeting.dto';
import { Meeting, MeetingDocument } from './schemas/meeting.schema';
import { ParticipantDocument } from './schemas/participant.schema';
export declare class MeetingsService {
    private readonly meetingModel;
    private readonly participantModel;
    private readonly auditService;
    constructor(meetingModel: Model<MeetingDocument>, participantModel: Model<ParticipantDocument>, auditService: AuditService);
    createMeeting(dto: CreateMeetingDto, userId: string, reqMeta: {
        ip: string;
        userAgent: string;
    }): Promise<import("mongoose").Document<unknown, {}, MeetingDocument, {}, {}> & Meeting & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    getMeetingById(meetingId: string): Promise<import("mongoose").Document<unknown, {}, MeetingDocument, {}, {}> & Meeting & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    getMeetingByCode(code: string): Promise<{
        id: any;
        code: string;
        title: string;
        hostId: string;
        status: "scheduled" | "active" | "ended";
    }>;
    joinMeeting(meetingId: string, dto: JoinMeetingDto, userId: string, reqMeta: {
        ip: string;
        userAgent: string;
    }): Promise<{
        meetingId: string;
        participantId: any;
        role: "host" | "participant" | "guest";
    }>;
    leaveMeeting(meetingId: string, participantId: string, userId: string, reqMeta: {
        ip: string;
        userAgent: string;
    }): Promise<{
        success: boolean;
    }>;
    private generateMeetingCode;
}
