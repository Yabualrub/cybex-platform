import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // =========================
  // SIGNUP (DEV ONLY)
  // =========================
  @Post('signup')
  signup(@Body() body: { email: string; password: string; company: string }) {
    if (process.env.DISABLE_SIGNUP === 'true') {
      throw new ForbiddenException('Signup disabled. Use public provision.');
    }
    return this.authService.signup(body);
  }

  // =========================
  // LOGIN
  // =========================
  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken } = await this.authService.login(body);

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      domain: isProd ? '.cybexs.com' : undefined,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return { success: true };
  }

  // =========================
  // ME
  // =========================
  @Get('me')
  @UseGuards(JwtGuard)
  me(@Req() req: Request) {
    const u: any = (req as any).user;

    return {
      id: u?.sub,
      email: u?.email,
      role: u?.role,
      tenantId: u?.tenantId,
    };
  }
@Get('introspect')
@UseGuards(JwtGuard)
introspect(@Req() req: Request) {
  const u: any = (req as any).user;

  return {
    sub: u?.sub,
    tenantId: u?.tenantId,
    role: u?.role,
    email: u?.email,
    tokenType: u?.tokenType ?? 'access',
  };
}
  // =========================
  // LOGOUT
  // =========================
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === 'production';

    res.clearCookie('access_token', {
      path: '/',
      domain: isProd ? '.cybexs.com' : undefined,
    });

    return { success: true };
  }
}
