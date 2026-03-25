import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Req,
  UseGuards,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { AuditService } from '../audit/audit.service';

@Controller('tickets')
@UseGuards(JwtGuard)
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly audit: AuditService,
  ) {}

  // =========================
  // Support endpoints (Global)
  // =========================
  private assertSupport(req: any) {
    const role = req.user?.role;
    if (!['TECH', 'ADMIN'].includes(role)) {
      throw new ForbiddenException('Support access only');
    }
  }

  @Get('support/all')
  supportListAll(@Req() req: any) {
    this.assertSupport(req);
    return this.ticketsService.supportListAllTickets();
  }

  @Get('support/:id')
  supportGetOne(@Req() req: any, @Param('id') id: string) {
    this.assertSupport(req);
    return this.ticketsService.supportGetTicket(id);
  }

  @Post('support/:id/comments')
  async supportAddComment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    this.assertSupport(req);

    const msg = await this.ticketsService.supportAddMessage(
      id,
      req.user.sub,
      body.body,
    );

    await this.audit.log({
      tenantId: msg.tenantId,
      userId: req.user.sub,
      action: 'TICKET_REPLY',
      entityType: 'ticket_message',
      entityId: msg.id,
      ip: this.audit.getClientIp(req),
      userAgent: this.audit.getUserAgent(req),
      metadata: { ticketId: id, kind: 'SUPPORT_COMMENT' },
    });

    return msg;
  }

  @Post('support/:id/reply')
  async supportReply(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    this.assertSupport(req);

    const msg = await this.ticketsService.supportAddMessage(
      id,
      req.user.sub,
      body.body,
    );

    await this.audit.log({
      tenantId: msg.tenantId,
      userId: req.user.sub,
      action: 'TICKET_REPLY',
      entityType: 'ticket_message',
      entityId: msg.id,
      ip: this.audit.getClientIp(req),
      userAgent: this.audit.getUserAgent(req),
      metadata: { ticketId: id, kind: 'SUPPORT_REPLY' },
    });

    return msg;
  }

  @Patch('support/:id/status')
  async supportUpdateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'RESOLVED' | 'CLOSED';
    },
  ) {
    this.assertSupport(req);

    const updated = await this.ticketsService.supportUpdateStatus(id, body.status);

    await this.audit.log({
      tenantId: updated.tenantId,
      userId: req.user.sub,
      action: 'TICKET_STATUS_CHANGE', // ✅ FIX
      entityType: 'ticket',
      entityId: updated.id,
      ip: this.audit.getClientIp(req),
      userAgent: this.audit.getUserAgent(req),
      metadata: { ticketId: id, status: body.status },
    });

    return updated;
  }

  // =========================
  // Client endpoints (Tenant scoped)
  // =========================
  @Get()
  list(@Req() req: any) {
    return this.ticketsService.listTickets(req.user.tenantId);
  }

  @Post()
  async create(@Req() req: any, @Body() body: { title: string; description: string }) {
    const ticket = await this.ticketsService.createTicket(req.user.tenantId, req.user.sub, body);

    await this.audit.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'TICKET_CREATE',
      entityType: 'ticket',
      entityId: ticket.id,
      ip: this.audit.getClientIp(req),
      userAgent: this.audit.getUserAgent(req),
      metadata: { title: body.title },
    });

    return ticket;
  }

  @Post(':id/comments')
  async addComment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    const msg = await this.ticketsService.addMessage(
      req.user.tenantId,
      id,
      req.user.sub,
      body.body,
    );

    await this.audit.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'TICKET_REPLY',
      entityType: 'ticket_message',
      entityId: msg.id,
      ip: this.audit.getClientIp(req),
      userAgent: this.audit.getUserAgent(req),
      metadata: { ticketId: id, kind: 'CLIENT_COMMENT' },
    });

    return msg;
  }

  @Post(':id/messages')
  async addMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    const msg = await this.ticketsService.addMessage(
      req.user.tenantId,
      id,
      req.user.sub,
      body.body,
    );

    await this.audit.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'TICKET_REPLY',
      entityType: 'ticket_message',
      entityId: msg.id,
      ip: this.audit.getClientIp(req),
      userAgent: this.audit.getUserAgent(req),
      metadata: { ticketId: id },
    });

    return msg;
  }

  @Get(':id')
  getOne(@Req() req: any, @Param('id') id: string) {
    return this.ticketsService.getTicket(req.user.tenantId, id);
  }
}
