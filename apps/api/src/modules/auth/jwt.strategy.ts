import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Role } from '@kitchenflow/types';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET')
    });
  }

  async validate(payload: { sub: string; restaurantId: string; role: Role }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, restaurantId: true, role: true }
    });
    if (!user || user.restaurantId !== payload.restaurantId || user.role !== payload.role) {
      throw new UnauthorizedException('Invalid access token');
    }
    return { userId: user.id, restaurantId: user.restaurantId, role: user.role };
  }
}
