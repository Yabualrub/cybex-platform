import { ForbiddenException, Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ServiceKey = 'ai_agent' | 'ai_calls' | 'dental' | 'rmm' | 'vision';

@Injectable()
export class TenantServicesService {
  constructor(private readonly prisma: PrismaService) {}

  // ======================
  // LIST SERVICES (TENANT)
  // ======================
  async list(tenantId: string) {
    const rows = await this.prisma.tenantService.findMany({
      where: { tenantId },
      select: {
        key: true,
        enabled: true,
        metadata: true,
        updatedAt: true,
      },
      orderBy: { key: 'asc' },
    });

    return rows.map((r) => ({
      key: r.key as ServiceKey,
      enabled: r.enabled,
      plan: (r.metadata as any)?.plan ?? null,
      updatedAt: r.updatedAt,
    }));
  }

  // ======================
  // UPDATE (ENABLE/DISABLE + PLAN)
  // ======================
  async update(tenantId: string, key: ServiceKey, enabled: boolean, plan?: string | null) {
    if (!key) throw new BadRequestException('service key is required');

    const metadata =
      plan === undefined
        ? undefined // لا تغير metadata لو ما انرسل plan
        : { ...(plan ? { plan } : {}) };

    const updated = await this.prisma.tenantService.update({
      where: {
        tenantId_key: { tenantId, key },
      },
      data: {
        enabled: Boolean(enabled),
        ...(metadata === undefined ? {} : { metadata }),
      },
      select: {
        key: true,
        enabled: true,
        metadata: true,
        updatedAt: true,
      },
    });

    return {
      key: updated.key as ServiceKey,
      enabled: updated.enabled,
      plan: (updated.metadata as any)?.plan ?? null,
      updatedAt: updated.updatedAt,
    };
  }

  // ======================
  // FEATURE ENFORCEMENT (CORE)
  // ======================
  async requireEnabled(tenantId: string, key: ServiceKey) {
    const service = await this.prisma.tenantService.findUnique({
      where: {
        tenantId_key: { tenantId, key },
      },
      select: { enabled: true },
    });

    if (!service || service.enabled !== true) {
      throw new ForbiddenException(`Service "${key}" is not enabled for this tenant`);
    }

    return true;
  }
}
