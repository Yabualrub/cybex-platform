import { Body, Controller, Post } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly svc: PublicService) {}

  // This is what your “landing website” will call for now.
  // Later Stripe webhook will call a similar function after payment success.
  @Post('provision')
  provision(
    @Body()
    body: {
      email: string;
      password: string;
      company: string;
      enable?: {
        ai_agent?: boolean;
        ai_calls?: boolean;
        dental?: boolean;
        rmm?: boolean;
        vision?: boolean;
      };
    },
  ) {
    return this.svc.provisionTenant(body);
  }

  // ✅ One-time endpoint (dev) to create Cybex Support account
  @Post('seed-support')
  seedSupport(
    @Body()
    body: {
      email: string;
      password: string;
    },
  ) {
    return this.svc.seedSupportUser(body);
  }
}
