import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
  Param,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { UsersService } from './users.service';
import { AuditService } from '../audit/audit.service';

type Role = 'OWNER' | 'ADMIN' | 'TECH' | 'USER';
type UserStatus = 'ACTIVE' | 'INVITED' | 'DISABLED';

@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly audit: AuditService,
  ) {}

  private assertAdmin(req: any) {
    const role = req.user?.role;
    if (role !== 'OWNER' && role !== 'ADMIN') {
      throw new ForbiddenException('OWNER/ADMIN only');
    }
  }

  // ======================
  // LIST USERS
  // ======================
  @Get()
  list(@Req() req: any) {
    this.assertAdmin(req);
    return this.users.listByTenant(req.user.tenantId);
  }

  // ======================
  // INVITE USER
  // ======================
  @Post('invite')
  async invite(@Req() req: any, @Body() body: { email: string; role: Role }) {
    this.assertAdmin(req);

    const invited = await this.users.inviteUser(req.user.tenantId, body);

    await this.audit.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'USER_INVITED',
      entityType: 'user',
      entityId: invited.id,
      ip: this.audit.getClientIp(req),
      userAgent: this.audit.getUserAgent(req),
      metadata: { email: invited.email, role: invited.role },
    });

    return invited;
  }

  // ======================
  // ACCEPT INVITE (PUBLIC-FACING LATER)
  // ======================
  @Post('accept-invite')
  async acceptInvite(@Body() body: { token: string; password: string }) {
    const user = await this.users.acceptInvite(body.token, body.password);
    return user;
  }

  // ======================
  // UPDATE ROLE
  // ======================
  @Patch(':id/role')
  async updateRole(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { role: Role },
  ) {
    this.assertAdmin(req);

    const updated = await this.users.updateRole(req.user.tenantId, id, body.role);

    await this.audit.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'USER_ROLE_CHANGE',
      entityType: 'user',
      entityId: updated.id,
      ip: this.audit.getClientIp(req),
      userAgent: this.audit.getUserAgent(req),
      metadata: { role: updated.role },
    });

    return updated;
  }

  // ======================
  // RESET PASSWORD (ADMIN/SUPPORT) -> generate token
  // ======================
  @Post(':id/reset-password')
  async resetPassword(@Req() req: any, @Param('id') id: string) {
    this.assertAdmin(req);

    const result = await this.users.generateResetPasswordToken(
      req.user.tenantId,
      id,
    );

    await this.audit.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'USER_PASSWORD_RESET',
      entityType: 'user',
      entityId: id,
      ip: this.audit.getClientIp(req),
      userAgent: this.audit.getUserAgent(req),
      metadata: { note: 'Password reset token generated' },
    });

    return result;
  }

  // ======================
  // ENABLE / DISABLE USER
  // ======================
  @Patch(':id/status')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: UserStatus },
  ) {
    this.assertAdmin(req);

    const updated = await this.users.updateStatus(req.user.tenantId, id, body.status);

    await this.audit.log({
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      action: 'USER_STATUS_CHANGE',
      entityType: 'user',
      entityId: updated.id,
      ip: this.audit.getClientIp(req),
      userAgent: this.audit.getUserAgent(req),
      metadata: { status: updated.status },
    });

    return updated;
  }
}
