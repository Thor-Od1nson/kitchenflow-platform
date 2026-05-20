import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CorrelationId } from '../../common/decorators/correlation-id.decorator';
import { AuthService } from './auth.service';
import { LoginDto, LogoutDto, RefreshDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto, @CorrelationId() correlationId?: string) {
    return this.auth.login(dto, correlationId);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  refresh(@Body() dto: RefreshDto, @CorrelationId() correlationId?: string) {
    return this.auth.refresh(dto.refreshToken, correlationId);
  }

  @Post('logout')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  logout(@Body() dto: LogoutDto, @CorrelationId() correlationId?: string) {
    return this.auth.logout(dto.refreshToken, correlationId);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.userId);
  }
}
