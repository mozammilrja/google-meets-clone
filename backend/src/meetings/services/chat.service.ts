import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatMessage, ChatMessageDocument } from '../schemas/chat-message.schema';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(ChatMessage.name) private chatMessageModel: Model<ChatMessageDocument>,
  ) {}

  /**
   * Save a chat message to the database
   */
  async saveMessage(
    meetingId: string,
    participantId: string,
    participantName: string,
    message: string,
  ): Promise<ChatMessageDocument> {
    try {
      const newMessage = new this.chatMessageModel({
        meetingId: new Types.ObjectId(meetingId),
        participantId,
        participantName,
        message,
        timestamp: new Date(),
      });

      const savedMessage = await newMessage.save();
      this.logger.log(
        `Chat message saved for meeting ${meetingId} by participant ${participantId}`,
      );
      return savedMessage;
    } catch (error) {
      this.logger.error('Failed to save chat message:', error);
      throw error;
    }
  }

  /**
   * Get chat message history for a meeting
   */
  async getMessageHistory(meetingId: string, limit: number = 50): Promise<ChatMessageDocument[]> {
    try {
      const messages = await this.chatMessageModel
        .find({ meetingId: new Types.ObjectId(meetingId) })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      return messages as unknown as ChatMessageDocument[];
    } catch (error) {
      this.logger.error('Failed to retrieve chat message history:', error);
      throw error;
    }
  }

  /**
   * Delete messages from a meeting (e.g., when meeting ends)
   */
  async deleteMessagesByMeeting(meetingId: string): Promise<void> {
    try {
      await this.chatMessageModel.deleteMany({ meetingId: new Types.ObjectId(meetingId) });
      this.logger.log(`Chat messages deleted for meeting ${meetingId}`);
    } catch (error) {
      this.logger.error('Failed to delete chat messages:', error);
      throw error;
    }
  }
}
