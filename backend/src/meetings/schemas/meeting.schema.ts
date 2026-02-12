import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MeetingDocument = Meeting & Document;

// Configure schema to transform _id to id for JSON serialization
@Schema({ 
  timestamps: true, 
  collection: 'meetings',
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
export class Meeting {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, unique: true })
  code!: string;

  @Prop({ required: true })
  hostId!: string;

  @Prop()
  scheduledAt?: Date;

  @Prop()
  duration?: number;

  @Prop({ default: 'scheduled' })
  status!: 'scheduled' | 'active' | 'ended';

  @Prop({ type: Object, default: {} })
  settings!: Record<string, any>;
}

export const MeetingSchema = SchemaFactory.createForClass(Meeting);
