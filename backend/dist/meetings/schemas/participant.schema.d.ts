import { Document } from 'mongoose';
export type ParticipantDocument = Participant & Document;
export declare class Participant {
    meetingId: string;
    userId?: string;
    name: string;
    role: 'host' | 'participant' | 'guest';
    status: 'connected' | 'left';
    audio: boolean;
    video: boolean;
    screenSharing: boolean;
    joinedAt: Date;
    leftAt?: Date;
}
export declare const ParticipantSchema: import("mongoose").Schema<Participant, import("mongoose").Model<Participant, any, any, any, Document<unknown, any, Participant, any, {}> & Participant & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Participant, Document<unknown, {}, import("mongoose").FlatRecord<Participant>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Participant> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
