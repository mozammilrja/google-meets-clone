import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ParticipantDocument = Participant & Document;

// Configure schema to transform _id to id for JSON serialization
@Schema({ 
  timestamps: true, 
  collection: 'participants',
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
})
export class Participant {
  @Prop({ required: true })
  meetingId!: string;

  @Prop()
  userId?: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  role!: 'host' | 'participant' | 'guest';

  @Prop({ default: 'connected' })
  status!: 'connected' | 'left';

  @Prop({ default: true })
  audio!: boolean;

  @Prop({ default: true })
  video!: boolean;

  @Prop({ default: false })
  screenSharing!: boolean;

  @Prop({ required: true })
  joinedAt!: Date;

  @Prop()
  leftAt?: Date;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);
