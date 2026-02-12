import { Document } from 'mongoose';
export type MeetingDocument = Meeting & Document;
export declare class Meeting {
    title: string;
    code: string;
    hostId: string;
    scheduledAt?: Date;
    duration?: number;
    status: 'scheduled' | 'active' | 'ended';
    settings: Record<string, any>;
}
export declare const MeetingSchema: import("mongoose").Schema<Meeting, import("mongoose").Model<Meeting, any, any, any, Document<unknown, any, Meeting, any, {}> & Meeting & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Meeting, Document<unknown, {}, import("mongoose").FlatRecord<Meeting>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Meeting> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
