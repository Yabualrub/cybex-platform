import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

type JwtPayload = {
  sub: string;
  tenantId: string;
  role: string;
  email?: string;
  tokenType?: string;
  iat?: number;
  exp?: number;
};

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    let token: string | undefined;

    // 1) Authorization header
    const auth = req.headers.authorization as string | undefined;
    if (auth?.startsWith('Bearer ')) {
      token = auth.slice('Bearer '.length).trim();
    }

    // 2) HttpOnly cookie (SSO)
    if (!token) {
      token = req.cookies?.access_token;
    }

    if (!token) throw new UnauthorizedException('Missing token');

    const secret = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) throw new UnauthorizedException('Invalid token');

    try {
      const payload = jwt.verify(token, secret) as JwtPayload;

      if (!payload?.sub || !payload?.tenantId || !payload?.role) {
        throw new UnauthorizedException('Invalid token');
      }

      if (payload.tokenType && payload.tokenType !== 'access') {
        throw new UnauthorizedException('Invalid token');
      }

      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
