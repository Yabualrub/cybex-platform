import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAction =
  | 'LOGIN'
  | 'TICKET_CREATE'
  | 'TICKET_REPLY'
  | 'TICKET_STATUS_CHANGE'
  | 'SERVICE_TOGGLE'
  | 'SERVICE_ENABLED'
  | 'SERVICE_DISABLED'
  | 'USER_CREATE'
  | 'USER_ROLE_CHANGE'
  | 'USER_PASSWORD_RESET'
  | 'USER_INVITED'
  | 'USER_STATUS_CHANGE';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  getClientIp(req: any): string | undefined {
    return (
      req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers?.['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress
    );
  }

  getUserAgent(req: any): string | undefined {
    return req.headers?.['user-agent'];
  }

  async log(data: {
    tenantId?: string | null;
    userId?: string | null;
    action: AuditAction;
    entityType?: string | null;
    entityId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: any | null;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: data.tenantId ?? null,
          userId: data.userId ?? null,
          action: data.action,
          entityType: data.entityType ?? null,
          entityId: data.entityId ?? null,
          ip: data.ip ?? null,
          userAgent: data.userAgent ?? null,
          metadata: data.metadata ?? null,
        },
      });
    } catch (e: any) {
      this.logger.error(`Audit log failed: ${e?.message || e}`);
    }
  }
}
