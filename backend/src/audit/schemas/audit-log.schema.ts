import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  @Prop()
  orgId?: string;

  @Prop({ required: true })
  actorId!: string;

  @Prop({ required: true })
  actorIP!: string;

  @Prop({ required: true })
  actorUserAgent!: string;

  @Prop({ required: true })
  action!: string;

  @Prop({ required: true })
  resource!: string;

  @Prop()
  resourceId?: string;

  @Prop({ required: true })
  timestamp!: Date;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, any>;

  @Prop({ default: true })
  success!: boolean;

  @Prop()
  errorMessage?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
