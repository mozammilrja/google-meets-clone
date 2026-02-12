import { Model } from 'mongoose';
import { ChatMessageDocument } from '../schemas/chat-message.schema';
export declare class ChatService {
    private chatMessageModel;
    private readonly logger;
    constructor(chatMessageModel: Model<ChatMessageDocument>);
    saveMessage(meetingId: string, participantId: string, participantName: string, message: string): Promise<ChatMessageDocument>;
    getMessageHistory(meetingId: string, limit?: number): Promise<ChatMessageDocument[]>;
    deleteMessagesByMeeting(meetingId: string): Promise<void>;
}
