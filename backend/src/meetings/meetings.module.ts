import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { Meeting, MeetingSchema } from './schemas/meeting.schema';
import { Participant, ParticipantSchema } from './schemas/participant.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';
import { ChatService } from './services/chat.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Meeting.name, schema: MeetingSchema },
      { name: Participant.name, schema: ParticipantSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema }
    ]),
    AuthModule,
    AuditModule
  ],
  controllers: [MeetingsController],
  providers: [MeetingsService, ChatService],
  exports: [ChatService]})
export class MeetingsModule {}