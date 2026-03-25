import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

type ServiceKey = 'ai_agent' | 'ai_calls' | 'dental' | 'rmm' | 'vision';
const DEFAULT_KEYS: ServiceKey[] = ['ai_agent', 'ai_calls', 'dental', 'rmm', 'vision'];

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  // =========================================================
  // PROVISION TENANT (DEV + LATER STRIPE WEBHOOK)
  // - Creates Tenant
  // - Creates OWNER user (ACTIVE if password provided, INVITED if not)
  // - Creates TenantService rows + enable flags
  // =========================================================
  async provisionTenant(data: {
    email: string;
    password?: string; // optional now
    company: string;
    enable?: Partial<Record<ServiceKey, boolean>>;
  }) {
    const email = (data.email || '').trim().toLowerCase();
    const company = (data.company || '').trim();

    if (!email || !company) {
      throw new BadRequestException('email and company are required');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const enableMap = data.enable || {};

    // ✅ create tenant
    const tenant = await this.prisma.tenant.create({
      data: { name: company },
      select: { id: true, name: true },
    });

    // ✅ create owner user
    const password = data.password?.trim();
    if (password) {
      if (password.length < 6) throw new BadRequestException('password must be at least 6 chars');

      const hashed = await bcrypt.hash(password, 10);

      await this.prisma.user.create({
        data: {
          tenantId: tenant.id,
          email,
          password: hashed,
          role: 'OWNER',
          status: 'ACTIVE',
        } as any,
        select: { id: true },
      });
    } else {
      // INVITED owner (set password via token later)
      const inviteToken = randomBytes(32).toString('hex');
      const inviteTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await this.prisma.user.create({
        data: {
          tenantId: tenant.id,
          email,
          password: 'INVITED_NO_PASSWORD',
          role: 'OWNER',
          status: 'INVITED',
          inviteToken,
          inviteTokenExpiresAt,
        } as any,
        select: { id: true },
      });

      // NOTE: Later -> send email with inviteToken
    }

    // ✅ create tenant services rows (idempotent)
    const rows = DEFAULT_KEYS.map((key) => ({
      tenantId: tenant.id,
      key,
      enabled: Boolean(enableMap[key]),
      metadata: enableMap[key] ? ({ plan: 'default' } as any) : null,
    }));

    await this.prisma.tenantService.createMany({
      data: rows as any,
      skipDuplicates: true,
    });

    return {
      success: true,
      tenant,
    };
  }

  // =========================================================
  // SEED SUPPORT USER (DEV)
  // =========================================================
  async seedSupportUser(data: { email: string; password: string; resetPassword?: boolean }) {
    const email = (data.email || '').trim().toLowerCase();
    const password = data.password;
    const resetPassword = Boolean(data.resetPassword);

    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }
    if (password.length < 6) {
      throw new BadRequestException('password must be at least 6 chars');
    }

    // 1) find or create internal tenant
    let tenant = await this.prisma.tenant.findFirst({
      where: { name: 'Cybex Internal' },
      select: { id: true, name: true },
    });

    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: { name: 'Cybex Internal' },
        select: { id: true, name: true },
      });

      const rows = DEFAULT_KEYS.map((key) => ({
        tenantId: tenant!.id,
        key,
        enabled: false,
        metadata: null,
      }));

      await this.prisma.tenantService.createMany({
        data: rows as any,
        skipDuplicates: true,
      });
    }

    // 2) if user exists -> optionally reset password + ensure TECH + tenant
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, tenantId: true },
    });

    if (existing) {
      if (resetPassword) {
        const hashed = await bcrypt.hash(password, 10);

        const updated = await this.prisma.user.update({
          where: { email },
          data: {
            password: hashed,
            role: 'TECH',
            tenantId: tenant.id,
            status: 'ACTIVE',
          } as any,
          select: { id: true, email: true, role: true, tenantId: true },
        });

        return {
          success: true,
          alreadyExists: true,
          passwordReset: true,
          tenant,
          user: updated,
        };
      }

      return {
        success: true,
        alreadyExists: true,
        passwordReset: false,
        tenant,
        user: existing,
      };
    }

    // 3) create new support user
    const hashed = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashed,
        role: 'TECH',
        tenantId: tenant.id,
        status: 'ACTIVE',
      } as any,
      select: { id: true, email: true, role: true, tenantId: true },
    });

    return {
      success: true,
      alreadyExists: false,
      passwordReset: false,
      tenant,
      user,
    };
  }
}
