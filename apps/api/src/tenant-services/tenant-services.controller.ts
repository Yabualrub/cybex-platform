import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { TenantServicesService } from './tenant-services.service';
import { AuditService } from '../audit/audit.service';

type ServiceKey = 'ai_agent' | 'ai_calls' | 'dental' | 'rmm' | 'vision';

@Controller('tenant/services')
@UseGuards(JwtGuard)
export class TenantServicesController {
  constructor(
    private readonly tenantServices: TenantServicesService,
    private readonly audit: AuditService,
  ) {}

  private assertAdmin(req: any) {
    const role = req.user?.role;
    if (role !== 'OWNER' && role !== 'ADMIN') {
      throw new ForbiddenException('OWNER/ADMIN only');
    }
  }

  // ======================
  // LIST SERVICES
  // ======================
  @Get()
  list(@Req() req: any) {
    return this.tenantServices.list(req.user.tenantId);
  }

  // ======================
  // ENTITLEMENTS MAP
  // ======================
  @Get('entitlements')
  async entitlements(@Req() req: any) {
    const rows = await this.tenantServices.list(req.user.tenantId);

    const enabled = new Set(
      (rows || []).filter((r: any) => !!r.enabled).map((r: any) => String(r.key)),
    );

    return {
      tenantId: req.user.tenantId,
      services: rows || [],
      entitlements: {
        ai_agent: enabled.has('ai_agent'),
        ai_calls: enabled.has('ai_calls'),
        dental: enabled.has('dental'),
        rmm: enabled.has('rmm'),
        vision: enabled.has('vision'),
      },
    };
  }

  // ======================
  // ENABLE / DISABLE SERVICE
  // ======================
  @Patch(':key')
  async toggle(
    @Req() req: any,
    @Param('key') key: ServiceKey,
    @Body() body: { enabled: boolean; plan?: string | null },
  ) {
    this.assertAdmin(req);

    const updated = await this.tenantServices.update(
      req.user.tenantId,
      key,
      body.enabled,
      body.plan ?? null,
    );

    await this.audit.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: body.enabled ? 'SERVICE_ENABLED' : 'SERVICE_DISABLED',
      entityType: 'tenant_service',
      entityId: key,
      ip: this.audit.getClientIp(req),
      userAgent: this.audit.getUserAgent(req),
      metadata: { enabled: body.enabled, plan: body.plan ?? null },
    });

    return updated;
  }
}
