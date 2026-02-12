import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

interface AuditLogInput {
  orgId?: string;
  actorId: string;
  actorIP: string;
  actorUserAgent: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditModel: Model<AuditLogDocument>
  ) {}

  async log(input: AuditLogInput): Promise<void> {
    const entry = new this.auditModel({
      orgId: input.orgId || 'default',
      actorId: input.actorId,
      actorIP: input.actorIP,
      actorUserAgent: input.actorUserAgent,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      timestamp: input.timestamp || new Date(),
      metadata: input.metadata || {},
      success: input.success ?? true,
      errorMessage: input.errorMessage
    });

    await entry.save();
  }
}
