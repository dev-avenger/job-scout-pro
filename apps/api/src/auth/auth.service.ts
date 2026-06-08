import { Injectable, Inject, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hashPassword, verifyPassword, generateId } from '@auto-job-apply/shared-utils';
import { AUTH_REPOSITORY } from './auth.constants.js';
import { AuthRepository } from './auth.repository.js';
import type { IAuthService, AuthTokens, AuthUser } from './interfaces/auth-service.interface.js';
import type { JwtPayload } from './interfaces/jwt-payload.interface.js';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(email: string, password: string): Promise<AuthTokens & { user: AuthUser }> {
    const existing = await this.repo.findUserByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await hashPassword(password);
    const userId = generateId();

    await this.repo.createUser({ id: userId, email, passwordHash });
    await this.repo.createDefaultPreferences({ id: generateId(), userId });

    const tokens = this.generateTokens({ sub: userId, email });

    return {
      ...tokens,
      user: {
        id: userId,
        email,
        autonomyMode: 'supervised',
        onboardingCompleted: false,
      },
    };
  }

  async login(email: string, password: string): Promise<AuthTokens & { user: AuthUser }> {
    const user = await this.repo.findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = this.generateTokens({ sub: user.id, email: user.email });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        autonomyMode: user.autonomyMode,
        onboardingCompleted: user.onboardingCompleted,
      },
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify<JwtPayload & { type?: string }>(refreshToken);
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return this.generateTokens({ sub: payload.sub, email: payload.email });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(_userId: string): Promise<void> {
    // With JWT, the client discards the token. No server-side invalidation needed.
  }

  private generateTokens(payload: JwtPayload): AuthTokens {
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: refreshExpiresIn },
    );

    return { accessToken, refreshToken, expiresIn: 900 };
  }
}
