import { DBAdapter, DBConfig } from "../../db-adapter/types";
import crypto from "crypto";

export class AuthService {
  constructor(
    private readonly adapter: DBAdapter,
    private readonly config: DBConfig
  ) {}

  async login(email: string, password: string) {
    if (!this.adapter.login) throw new Error("Login not supported for this adapter");
    return this.adapter.login(this.config, email, password);
  }

  async register(data: { email: string; password: string; full_name?: string }) {
    if (!this.adapter.register) throw new Error("Register not supported for this adapter");
    return this.adapter.register(this.config, data);
  }

  async getCurrentUser(token?: string) {
    if (!this.adapter.getCurrentUser) return null;
    return this.adapter.getCurrentUser(this.config, token);
  }

  async logout(token?: string) {
    if (!this.adapter.logout) return { success: true };
    return this.adapter.logout(this.config, token);
  }

  async sendResetEmail(email: string, redirectUrl: string) {
    if (!this.adapter.sendResetEmail) {
      throw new Error("Password reset not supported for this adapter");
    }
    return this.adapter.sendResetEmail(this.config, email, redirectUrl);
  }

  async resetPassword(token: string, newPassword: string) {
    if (!this.adapter.resetPassword) {
      throw new Error("Password reset not supported for this adapter");
    }
    return this.adapter.resetPassword(this.config, token, newPassword);
  }

  /**
   * Extend token expiry (only for token-based adapters)
   */
  async extendToken(
    tokenId: string,
    data?: { access_expires_at?: Date; refresh_expires_at?: Date }
  ) {
    if (!this.adapter.extendToken) return;

    const payload = {
      access_expires_at:
        data?.access_expires_at ??
        new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      refresh_expires_at:
        data?.refresh_expires_at ??
        new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    return this.adapter.extendToken(tokenId, payload);
  }

  /**
   * Convenience method to validate access token
   */
  async validateAccessToken(token: string) {
    if (!this.adapter.findTokenByAccessToken) return null;
    const tokenData = await this.adapter.findTokenByAccessToken(token);
    if (!tokenData || tokenData.revoked) return null;
    return tokenData;
  }

  /**
   * ----------------------------------
   * ISSUE ACCESS + REFRESH TOKENS
   * ----------------------------------
   * Used by SQL & Mongo adapters
   * Firebase / Supabase still auth users,
   * but tokens are issued here.
   */
  async issueTokens(input: { userId: string; projectId?: string | null }) {
    if (!this.adapter.createToken) {
      throw new Error("Token issuing not supported for this adapter");
    }

    const accessToken = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();

    const accessTokenHash = crypto
      .createHash("sha256")
      .update(accessToken)
      .digest("hex");

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const now = new Date();

    const accessExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 min
    const refreshExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.adapter.createToken({
      token_id: crypto.randomUUID(),
      user_id: input.userId,
      project_id: input.projectId ?? null,
      access_token_hash: accessTokenHash,
      refresh_token_hash: refreshTokenHash,
      access_expires_at: accessExpiresAt,
      refresh_expires_at: refreshExpiresAt,
      revoked: false,
      created_at: now,
      updated_at: now,
    });

    return {
      accessToken,
      refreshToken,
      accessExpiresAt,
      refreshExpiresAt,
    };
  }
}
