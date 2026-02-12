import { Model } from 'mongoose';
import { AuditLogDocument } from './schemas/audit-log.schema';
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
export declare class AuditService {
    private readonly auditModel;
    constructor(auditModel: Model<AuditLogDocument>);
    log(input: AuditLogInput): Promise<void>;
}
export {};
