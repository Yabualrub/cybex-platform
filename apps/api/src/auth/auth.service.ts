import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

type SignupDto = { email: string; password: string; company: string };
type LoginDto = { email: string; password: string };

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  // =========================
  // SIGNUP
  // =========================
  async signup(data: SignupDto) {
    const email = data.email?.trim().toLowerCase();
    const password = data.password;
    const company = data.company?.trim();

    if (!email || !password || !company) {
      throw new BadRequestException('email, password, company are required');
    }

    if (password.length < 6) {
      throw new BadRequestException('password must be at least 6 chars');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Email already in use');

    const hashed = await bcrypt.hash(password, 10);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: company,
        users: {
          create: {
            email,
            password: hashed,
            role: 'OWNER',
            status: 'ACTIVE',
          },
        },
      },
      select: { id: true, name: true },
    });

    return { success: true, tenant };
  }

  // =========================
  // LOGIN
  // =========================
  async login(data: LoginDto) {
    const email = data.email?.trim().toLowerCase();
    const password = data.password;

    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        tenantId: true,
        status: true,
      },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is not active');
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      tokenType: 'access',
    };

    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: '2h',
    });

    return { accessToken };
  }
}
