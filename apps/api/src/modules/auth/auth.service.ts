import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@kitchenflow/types';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto';

interface TokenPayload {
  sub: string;
  restaurantId: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.prisma.analyticsEvent.create({
      data: {
        restaurantId: user.restaurantId,
        type: 'login',
        dimensions: { actorId: user.id },
        metrics: { detail: `${user.fullName} signed in` }
      }
    });
    return this.issueTokens(user.id, user.restaurantId, user.role);
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
    const matchingToken = await this.findMatchingRefreshToken(refreshToken, tokens);
    if (!matchingToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: matchingToken.id },
      data: { revokedAt: new Date() }
    });

    return this.issueTokens(payload.sub, payload.restaurantId, payload.role);
  }

  async logout(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        revokedAt: null
      }
    });
    const matchingToken = await this.findMatchingRefreshToken(refreshToken, tokens);
    if (matchingToken) {
      await this.prisma.refreshToken.update({
        where: { id: matchingToken.id },
        data: { revokedAt: new Date() }
      });
    }
    await this.prisma.analyticsEvent.create({
      data: {
        restaurantId: payload.restaurantId,
        type: 'logout',
        dimensions: { actorId: payload.sub },
        metrics: { detail: 'User signed out' }
      }
    });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        restaurantId: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            outlets: {
              select: { id: true, name: true, city: true },
              orderBy: { name: 'asc' }
            }
          }
        }
      }
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private async issueTokens(userId: string, restaurantId: string, role: Role) {
    const payload = { sub: userId, restaurantId, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m'
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '30d'
      })
    ]);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: await bcrypt.hash(refreshToken, 12),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    const user = await this.me(userId);
    return { accessToken, refreshToken, user };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<TokenPayload> {
    try {
      return await this.jwt.verifyAsync<TokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET')
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async findMatchingRefreshToken(
    refreshToken: string,
    tokens: Array<{ id: string; tokenHash: string }>
  ) {
    for (const token of tokens) {
      if (await bcrypt.compare(refreshToken, token.tokenHash)) {
        return token;
      }
    }
    return null;
  }
}
