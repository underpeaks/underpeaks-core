import { NextRequest, NextResponse } from 'next/server';
import { DBAdapter, DBConfig } from '../db-adapter/types';
import { AuthService } from './auth-service';

/**
 * Auth guard for API routes or middleware.
 * @param req NextRequest
 * @param adapter Any DBAdapter (Postgres, MySQL, MongoDB, etc.)
 * @param config DBConfig for the adapter
 */
export async function authGuard(req: NextRequest, adapter: DBAdapter, config: DBConfig) {
  try {
    const authService = new AuthService(adapter, config);

    // Expect token in Authorization header: "Bearer <token>"
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 });
    }

    // Validate token
    const user = await authService.validateAccessToken(token);

    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
    }

    // Optional: Extend token if hybrid approach is used
    await authService.extendToken(user.tokenId);

    // Attach user to request for downstream handlers
    (req as any).user = user;

    return NextResponse.next();
  } catch (err: any) {
    console.error('[auth-guard] Error validating token:', err.message);
    return NextResponse.json({ success: false, message: 'Authentication failed' }, { status: 500 });
  }
}
