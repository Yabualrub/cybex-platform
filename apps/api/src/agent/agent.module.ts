import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantServicesModule } from '../tenant-services/tenant-services.module';

@Module({
  imports: [PrismaModule, TenantServicesModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
