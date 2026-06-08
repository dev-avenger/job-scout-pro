import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { AuthController } from './auth.controller.js';
import { AUTH_SERVICE, AUTH_REPOSITORY } from './auth.constants.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    { provide: AUTH_REPOSITORY, useClass: AuthRepository },
    { provide: AUTH_SERVICE, useClass: AuthService },
  ],
  exports: [AUTH_SERVICE, JwtModule, PassportModule],
})
export class AuthModule {}
