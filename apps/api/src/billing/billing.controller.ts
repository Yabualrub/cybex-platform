import {
  Controller,
  Post,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { BillingService } from './billing.service';

@Controller('billing')
@UseGuards(JwtGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  // ======================
  // STRIPE CUSTOMER PORTAL (SKELETON)
  // ======================
  @Post('portal')
  async openPortal(@Req() req: any) {
    const { tenantId, sub: userId } = req.user;

    const result = await this.billing.createPortalSession(tenantId, userId);

    return {
      success: true,
      url: result.url,
    };
  }

  // ======================
  // INVOICES (SKELETON)
  // ======================
  @Get('invoices')
  async listInvoices(@Req() req: any) {
    const { tenantId } = req.user;

    const invoices = await this.billing.listInvoices(tenantId);

    return {
      success: true,
      invoices,
    };
  }

  // ======================
  // PAYMENTS (SKELETON)
  // ======================
  @Get('payments')
  async listPayments(@Req() req: any) {
    const { tenantId } = req.user;

    const payments = await this.billing.listPayments(tenantId);

    return {
      success: true,
      payments,
    };
  }
}
