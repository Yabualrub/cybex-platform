import { Controller, Get, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('audit')
@UseGuards(JwtGuard)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Req() req: any,
    @Query('limit') limitStr?: string,
  ) {
    const user = req.user;

    if (!user?.tenantId) {
      throw new ForbiddenException('Missing tenant');
    }

    // only OWNER/ADMIN
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Only OWNER/ADMIN can view audit logs');
    }

    const limit = Math.min(parseInt(limitStr ?? '20', 10) || 20, 100);

    const rows = await this.prisma.auditLog.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        userId: true,
        ip: true,
        userAgent: true,
        metadata: true,
        createdAt: true,
      },
    });

    return rows;
  }
}
