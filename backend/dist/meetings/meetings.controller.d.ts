import { Request } from 'express';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { JoinMeetingDto } from './dto/join-meeting.dto';
import { MeetingsService } from './meetings.service';
export declare class MeetingsController {
    private readonly meetingsService;
    constructor(meetingsService: MeetingsService);
    create(dto: CreateMeetingDto, req: Request): Promise<import("mongoose").Document<unknown, {}, import("./schemas/meeting.schema").MeetingDocument, {}, {}> & import("./schemas/meeting.schema").Meeting & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    getById(meetingId: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/meeting.schema").MeetingDocument, {}, {}> & import("./schemas/meeting.schema").Meeting & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    getByCode(code: string): Promise<{
        id: any;
        code: string;
        title: string;
        hostId: string;
        status: "scheduled" | "active" | "ended";
    }>;
    join(meetingId: string, dto: JoinMeetingDto, req: Request): Promise<{
        meetingId: string;
        participantId: any;
        role: "host" | "participant" | "guest";
    }>;
    leave(meetingId: string, participantId: string, req: Request): Promise<{
        success: boolean;
    }>;
}
