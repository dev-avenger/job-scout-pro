import type { JwtPayload } from './jwt-payload.interface.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  autonomyMode: string;
  onboardingCompleted: boolean;
}

export interface IAuthService {
  register(email: string, password: string): Promise<AuthTokens & { user: AuthUser }>;
  login(email: string, password: string): Promise<AuthTokens & { user: AuthUser }>;
  refresh(refreshToken: string): Promise<AuthTokens>;
  logout(userId: string): Promise<void>;
}
