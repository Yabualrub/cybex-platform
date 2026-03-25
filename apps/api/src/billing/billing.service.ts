import { Injectable } from '@nestjs/common';

@Injectable()
export class BillingService {
  // ======================
  // STRIPE CUSTOMER PORTAL (SKELETON)
  // ======================
  async createPortalSession(tenantId: string, userId: string) {
    // لاحقًا: ربط Stripe customer + portal
    return {
      url: null,
    };
  }

  // ======================
  // INVOICES (SKELETON)
  // ======================
  async listInvoices(tenantId: string) {
    return [];
  }

  // ======================
  // PAYMENTS (SKELETON)
  // ======================
  async listPayments(tenantId: string) {
    return [];
  }
}
