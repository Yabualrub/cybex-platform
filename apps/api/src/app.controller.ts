import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from './auth/guards/jwt.guard';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  // ======================
  // ENTITLEMENTS (for frontend gating)
  // ======================
  @Get('entitlements')
  @UseGuards(JwtGuard)
  async entitlements(@Req() req: any) {
    const tenantId = req.user.tenantId;

    const rows = await this.prisma.tenantService.findMany({
      where: { tenantId },
      select: { key: true, enabled: true },
    });

    const entitlements: Record<string, boolean> = {};
    for (const r of rows) entitlements[r.key] = !!r.enabled;

    return { entitlements };
  }
}
