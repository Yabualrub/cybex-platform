import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { AgentService } from './agent.service';
import { TenantServicesService } from '../tenant-services/tenant-services.service';

@Controller('agent')
@UseGuards(JwtGuard)
export class AgentController {
  constructor(
    private readonly agent: AgentService,
    private readonly tenantServices: TenantServicesService,
  ) {}

  private async requireAgentEnabled(req: any) {
    await this.tenantServices.requireEnabled(req.user.tenantId, 'ai_agent');
  }

  @Get('settings')
  async getSettings(@Req() req: any) {
    await this.requireAgentEnabled(req);
    return this.agent.getSettings(req.user.tenantId);
  }

  @Patch('settings')
  async updateSettings(@Req() req: any, @Body() body: any) {
    await this.requireAgentEnabled(req);
    return this.agent.updateSettings(req.user.tenantId, body ?? {});
  }

  @Get('conversations')
  async listConversations(@Req() req: any) {
    await this.requireAgentEnabled(req);
    return this.agent.listConversations(req.user.tenantId, req.user);
  }

  @Delete('conversations/:id')
  async deleteConversation(@Req() req: any, @Param('id') id: string) {
    await this.requireAgentEnabled(req);
    return this.agent.deleteConversation(req.user.tenantId, req.user, id);
  }

  @Post('conversations')
  async createConversation(@Req() req: any, @Body() body: any) {
    await this.requireAgentEnabled(req);
    return this.agent.createConversation(req.user.tenantId, req.user, body ?? {});
  }

  @Get('conversations/:id/messages')
  async getMessages(@Req() req: any, @Param('id') id: string) {
    await this.requireAgentEnabled(req);
    return this.agent.getMessages(req.user.tenantId, req.user, id);
  }

  @Post('conversations/:id/send')
  async send(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    await this.requireAgentEnabled(req);
    return this.agent.sendMessage(req.user.tenantId, req.user, id, body?.content);
  }
}
