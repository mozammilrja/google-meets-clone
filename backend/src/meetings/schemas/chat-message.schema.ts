import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({ timestamps: true, collection: 'chat_messages' })
export class ChatMessage {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Meeting' })
  meetingId!: Types.ObjectId;

  @Prop({ required: true })
  participantId!: string;

  @Prop({ required: true })
  participantName!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({ default: Date.now })
  timestamp!: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
