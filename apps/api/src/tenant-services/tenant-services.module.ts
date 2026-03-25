import { Module } from '@nestjs/common';
import { TenantServicesController } from './tenant-services.controller';
import { TenantServicesService } from './tenant-services.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [TenantServicesController],
  providers: [PrismaService, TenantServicesService],
  exports: [TenantServicesService],
})
export class TenantServicesModule {}
