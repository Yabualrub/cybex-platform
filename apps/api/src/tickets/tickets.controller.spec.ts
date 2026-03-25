import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtGuard } from '../auth/guards/jwt.guard';

@Controller('tickets')
@UseGuards(JwtGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@Req() req: any, @Body() body: { title: string; description: string }) {
    const tenantId = req.user.tenantId;
    const userId = req.user.sub;
    return this.ticketsService.createTicket(tenantId, userId, body);
  }

  @Get()
  list(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.ticketsService.listTickets(tenantId);
  }
}
