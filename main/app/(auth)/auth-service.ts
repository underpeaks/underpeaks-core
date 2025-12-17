import crypto from "crypto";
import { DBAdapter, DBConfig } from '../db-adapter/types';

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const AUTO_REFRESH_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export class AuthService {
  constructor(private adapter: DBAdapter, private config: DBConfig) {}

  /* ------------------------------------------------------------------ */
  /* Token creation                                                     */
  /* ------------------------------------------------------------------ */

  async issueTokens(params: {
    userId: string;
    projectId: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<IssuedTokens> {
    const now = Date.now();

    const tokenId = crypto.randomUUID();
    const accessToken = this.generateToken();
    const refreshToken = this.generateToken();

    const accessExpiresAt = new Date(now + ACCESS_TOKEN_TTL_MS);
    const refreshExpiresAt = new Date(now + REFRESH_TOKEN_TTL_MS);

    await this.adapter.createToken({
      token_id: tokenId,
      user_id: params.userId,
      project_id: params.projectId,
      access_token_hash: this.hash(accessToken),
      refresh_token_hash: this.hash(refreshToken),
      access_expires_at: accessExpiresAt,
      refresh_expires_at: refreshExpiresAt,
      revoked: false,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return {
      accessToken,
      refreshToken,
      expiresAt: accessExpiresAt,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Access token validation + auto refresh                              */
  /* ------------------------------------------------------------------ */

  async validateAccessToken(accessToken: string) {
    const tokenHash = this.hash(accessToken);
    const token = await this.adapter.findTokenByAccessToken(tokenHash);

    if (!token) return null;
    if (token.revoked) return null;
    if (new Date(token.access_expires_at).getTime() < Date.now()) return null;

    // Sliding refresh
    const remaining = new Date(token.access_expires_at).getTime() - Date.now();
    if (remaining < AUTO_REFRESH_THRESHOLD_MS) {
      await this.extendToken(token.token_id);
    }

    return {
      userId: token.user_id,
      projectId: token.project_id,
      tokenId: token.token_id,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Refresh token exchange                                             */
  /* ------------------------------------------------------------------ */

  async refreshTokens(refreshToken: string): Promise<IssuedTokens | null> {
    const tokenHash = this.hash(refreshToken);
    const token = await this.adapter.findTokenByRefreshToken(tokenHash);

    if (!token) return null;
    if (token.revoked) return null;
    if (new Date(token.refresh_expires_at).getTime() < Date.now()) return null;

    // Revoke old token
    await this.adapter.revokeToken(token.token_id);

    // Issue new token pair
    return this.issueTokens({
      userId: token.user_id,
      projectId: token.project_id,
    });
  }

  /* ------------------------------------------------------------------ */
  /* Logout / revoke                                                    */
  /* ------------------------------------------------------------------ */

  async revokeToken(tokenId: string): Promise<void> {
    await this.adapter.revokeToken(tokenId);
  }

  /* ------------------------------------------------------------------ */
  /* Internal helpers                                                   */
  /* ------------------------------------------------------------------ */

   async extendToken(tokenId: string) {
    const now = Date.now();
    await this.adapter.extendToken(tokenId, {
      access_expires_at: new Date(now + ACCESS_TOKEN_TTL_MS),
      refresh_expires_at: new Date(now + REFRESH_TOKEN_TTL_MS),
      updated_at: new Date(),
    });
  }

  private generateToken(): string {
    return crypto.randomBytes(48).toString("hex");
  }

  private hash(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
  }
}
