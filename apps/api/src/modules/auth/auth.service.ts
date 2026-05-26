import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@kitchenflow/types';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../../common/audit/audit.service';
import { ObservabilityService } from '../../common/observability/observability.service';
import { normalizeCity, normalizeOutletName } from '../../common/operational-normalization';
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
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly observability: ObservabilityService
  ) {}

  async login(dto: LoginDto, correlationId?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      this.observability.warn('auth_login_failed', {
        module: 'auth',
        requestId: correlationId,
        email: dto.email,
        reason: user ? 'invalid_password' : 'user_not_found'
      });
      if (user) {
        await this.audit.record({
          restaurantId: user.restaurantId,
          actorUserId: user.id,
          actorRole: user.role,
          action: 'auth.failed',
          entityType: 'user',
          entityId: user.id,
          metadata: { email: dto.email },
          correlationId
        });
      }
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
    await this.audit.record({
      restaurantId: user.restaurantId,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      metadata: { email: user.email },
      correlationId
    });
    return this.issueTokens(user.id, user.restaurantId, user.role);
  }

  async refresh(refreshToken: string, correlationId?: string) {
    let payload: TokenPayload;
    try {
      payload = await this.verifyRefreshToken(refreshToken);
    } catch (error) {
      this.observability.warn('auth_refresh_failed', {
        module: 'auth',
        requestId: correlationId,
        reason: error instanceof Error ? error.message : 'invalid_refresh_token'
      });
      throw error;
    }
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
      this.observability.warn('auth_refresh_failed', {
        module: 'auth',
        requestId: correlationId,
        userId: payload.sub,
        role: payload.role,
        reason: 'refresh_token_not_active'
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: matchingToken.id },
      data: { revokedAt: new Date() }
    });

    this.observability.recordAuthRefresh({
      requestId: correlationId,
      userId: payload.sub,
      role: payload.role
    });
    return this.issueTokens(payload.sub, payload.restaurantId, payload.role);
  }

  async logout(refreshToken: string, correlationId?: string) {
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
    await this.audit.record({
      restaurantId: payload.restaurantId,
      actorUserId: payload.sub,
      actorRole: payload.role,
      action: 'auth.logout',
      entityType: 'user',
      entityId: payload.sub,
      metadata: {},
      correlationId
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
      this.observability.warn('auth_bootstrap_failed', {
        module: 'auth',
        userId,
        reason: 'user_not_found'
      });
      throw new UnauthorizedException('User not found');
    }
    return {
      ...user,
      restaurant: {
        ...user.restaurant,
        name: user.restaurant.name.toLowerCase().includes('demo') || user.restaurant.name === 'KitchenFlow GCC Brands' ? 'GCC Operations Cluster' : user.restaurant.name,
        outlets: user.restaurant.outlets.map((outlet) => ({
          ...outlet,
          name: normalizeOutletName(outlet.name),
          city: normalizeCity(outlet.city)
        }))
      }
    };
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
