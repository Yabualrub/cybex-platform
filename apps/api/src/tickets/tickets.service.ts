import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  // =========================
  // Client (Tenant-scoped)
  // =========================

  async createTicket(
    tenantId: string,
    userId: string,
    data: { title: string; description: string },
  ) {
    if (!data.title || !data.description) {
      throw new BadRequestException('title and description are required');
    }

    return this.prisma.ticket.create({
      data: {
        tenantId,
        title: data.title,
        description: data.description,
        createdById: userId,
      },
      select: { id: true, title: true, status: true, createdAt: true },
    });
  }

  async listTickets(tenantId: string) {
    return this.prisma.ticket.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, status: true, createdAt: true },
    });
  }

  async getTicket(tenantId: string, ticketId: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, tenantId },
      select: {
        id: true,
        tenantId: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, email: true, fullName: true, role: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            body: true,
            createdAt: true,
            author: { select: { id: true, email: true, fullName: true, role: true } },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async addMessage(tenantId: string, ticketId: string, userId: string, body: string) {
    if (!body) throw new BadRequestException('body is required');

    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, tenantId },
      select: { id: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    return this.prisma.ticketMessage.create({
      data: {
        ticketId,
        authorId: userId,
        body,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { id: true, email: true, fullName: true, role: true } },
      },
    });
  }

  // =========================
  // Support (Global)
  // =========================

  async supportListAllTickets() {
    return this.prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        title: true,
        status: true,
        createdAt: true,
        tenant: { select: { id: true, name: true } },
        createdBy: { select: { id: true, email: true, fullName: true, role: true } },
      },
    });
  }

  async supportGetTicket(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        tenantId: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        tenant: { select: { id: true, name: true } },
        createdBy: { select: { id: true, email: true, fullName: true, role: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            body: true,
            createdAt: true,
            author: { select: { id: true, email: true, fullName: true, role: true } },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  // ✅ Support add message by ticketId (no tenant filter)
  async supportAddMessage(ticketId: string, userId: string, body: string) {
    if (!body) throw new BadRequestException('body is required');

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, tenantId: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const msg = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        authorId: userId,
        body,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { id: true, email: true, fullName: true, role: true } },
      },
    });

    return { ...msg, tenantId: ticket.tenantId };
  }

  // ✅ Support update status (global)
  async supportUpdateStatus(
    ticketId: string,
    status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'RESOLVED' | 'CLOSED',
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, tenantId: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status },
      select: { id: true, tenantId: true, status: true, updatedAt: true },
    });

    return updated;
  }
}
