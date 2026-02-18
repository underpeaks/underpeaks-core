import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/app/db-adapter";
import type { DBType, DBConfig } from "@/app/db-adapter/types";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "No verification token provided." },
        { status: 400 }
      );
    }

    const dbType = process.env.NEXT_DB_TYPE as DBType;
    if (!dbType) throw new Error("NEXT_DB_TYPE not set");

    let dbConfig: DBConfig;

    // ---------------- MYSQL ----------------
    if (dbType === "mysql") {
      dbConfig = {
        type: "mysql",
        host: process.env.NEXT_DB_MYSQL_HOST!,
        user: process.env.NEXT_DB_MYSQL_USER!,
        password: process.env.NEXT_DB_MYSQL_PASSWORD!,
        database: process.env.NEXT_DB_MYSQL_DATABASE!,
        port: process.env.NEXT_DB_MYSQL_PORT
          ? Number(process.env.NEXT_DB_MYSQL_PORT)
          : 3306,
      };
    }

    // ---------------- POSTGRES ----------------
    else if (dbType === "postgres") {
      dbConfig = {
        type: "postgres",
        host: process.env.NEXT_DB_POSTGRES_HOST!,
        user: process.env.NEXT_DB_POSTGRES_USER!,
        password: process.env.NEXT_DB_POSTGRES_PASSWORD!,
        database: process.env.NEXT_DB_POSTGRES_DB!,
        port: process.env.NEXT_DB_POSTGRES_PORT
          ? Number(process.env.NEXT_DB_POSTGRES_PORT)
          : 5432,
      };
    }

    // ---------------- MONGODB ----------------
    else if (dbType === "mongodb") {
      dbConfig = {
        type: "mongodb",
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database: process.env.NEXT_DB_MONGO_DB_NAME!,
      };
    }

    else {
      throw new Error(`Unsupported DB type: ${dbType}`);
    }

    const adapter = getAdapter(dbType, dbConfig);

    if (!adapter.findUserByToken)
      throw new Error("Adapter does not support token lookup");

    // Lookup user by token (MySQL/Postgres: token, MongoDB: email_verification_token)
    const user = await adapter.findUserByToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token." },
        { status: 400 }
      );
    }

    // ---------- UPDATE USER ----------
    if (adapter.update) {
      // Standardize fields to clear verification token after successful verification
      const updateData: any = {
        email_verified: 1,
        updated_at: new Date(),
      };

      // MySQL/Postgres use `token` fields
      if ("token" in user) {
        updateData.token = null;
        updateData.token_ttl = null;
      }

      // MongoDB uses `email_verification_token` and `email_verification_ttl`
      if ("email_verification_token" in user) {
        updateData.email_verification_token = null;
        updateData.email_verification_ttl = null;
      }

      await adapter.update(
        dbConfig,
        "nxf_users",
        user.user_id,
        updateData,
        "user_id"
      );
    } else {
      throw new Error("Adapter does not support update");
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully! Redirecting to Sign In...",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Verification failed." },
      { status: 500 }
    );
  }
}
