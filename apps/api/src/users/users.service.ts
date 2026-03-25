import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

type Role = 'OWNER' | 'ADMIN' | 'TECH' | 'USER';
type UserStatus = 'ACTIVE' | 'INVITED' | 'DISABLED';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ======================
  // LIST USERS (TENANT)
  // ======================
  async listByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  // ======================
  // INVITE USER (stores token on USER record)
  // ======================
  async inviteUser(tenantId: string, input: { email: string; role: Role }) {
    const email = input.email?.trim().toLowerCase();
    const role = input.role;

    if (!email) throw new BadRequestException('email is required');

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('Email already in use');

    const inviteToken = randomBytes(32).toString('hex');
    const inviteTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // ✅ DEV: we return token for now (later: email it)
    return this.prisma.user.create({
      data: {
        tenantId,
        email,
        role,
        status: 'INVITED',
        inviteToken,
        inviteTokenExpiresAt,
        // password stays empty until acceptInvite sets it
        password: 'INVITED_NO_PASSWORD',
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        inviteToken: true,
        inviteTokenExpiresAt: true,
      },
    });
  }

  // ======================
  // ACCEPT INVITE (SET PASSWORD)
  // ======================
  async acceptInvite(token: string, password: string) {
    if (!token) throw new BadRequestException('token is required');
    if (!password || password.length < 6) {
      throw new BadRequestException('password must be at least 6 chars');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        inviteToken: token,
        inviteTokenExpiresAt: { gt: new Date() },
        status: 'INVITED',
      },
      select: { id: true, tenantId: true, email: true, role: true, status: true },
    });

    if (!user) throw new BadRequestException('Invalid or expired invite');

    const hashed = await bcrypt.hash(password, 10);

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        status: 'ACTIVE',
        inviteToken: null,
        inviteTokenExpiresAt: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        tenantId: true,
      },
    });
  }

  // ======================
  // UPDATE ROLE
  // ======================
  async updateRole(tenantId: string, userId: string, nextRole: Role) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === 'OWNER' && nextRole !== 'OWNER') {
      const owners = await this.prisma.user.count({
        where: { tenantId, role: 'OWNER' },
      });
      if (owners <= 1) {
        throw new BadRequestException('Tenant must have at least one OWNER');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: nextRole },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        tenantId: true,
      },
    });
  }

  // ======================
  // RESET PASSWORD TOKEN (stores token on USER record)
  // ======================
  async generateResetPasswordToken(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, email: true, status: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.status === 'DISABLED') throw new BadRequestException('User disabled');

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiresAt },
      select: { id: true, email: true, resetToken: true, resetTokenExpiresAt: true },
    });

    // ✅ DEV: return token for now (later: email it)
    return {
      success: true,
      userId: updated.id,
      email: updated.email,
      resetToken: updated.resetToken,
      expiresAt: updated.resetTokenExpiresAt,
    };
  }

  // ======================
  // ENABLE / DISABLE USER
  // ======================
  async updateStatus(tenantId: string, userId: string, status: UserStatus) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });
  }
}
