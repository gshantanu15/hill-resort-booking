import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as authSchema from "@/db/auth-schema";

// Better Auth's generic return type includes the inferred additional fields;
// keeping the memoized handle opaque avoids widening it to the base options type.
function buildAuth() {
  const url = process.env.DATABASE_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!url) throw new Error("DATABASE_URL is not configured");
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not configured");
  const client = postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
  });
  const db = drizzle(client, { schema: authSchema });
  const baseURL = configuredBaseURL();
  return betterAuth({
    secret,
    baseURL,
    trustedOrigins: [baseURL],
    advanced: { useSecureCookies: new URL(baseURL).protocol === "https:" },
    disabledPaths: [
      "/change-password",
      "/set-password",
      "/update-user",
      "/delete-user",
      "/change-email",
      "/link-social",
      "/unlink-account",
    ],
    database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
    emailAndPassword: { enabled: true, disableSignUp: true },
    session: {
      expiresIn: 60 * 60 * 8,
      updateAge: 60 * 60,
      cookieCache: { enabled: false },
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "guest",
          input: false,
        },
      },
    },
  });
}

let instance: ReturnType<typeof buildAuth> | undefined;

function configuredBaseURL() {
  const explicit = process.env.BETTER_AUTH_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const deployment = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (deployment)
    return deployment.startsWith("http") ? deployment : `https://${deployment}`;
  return "http://localhost:3000";
}

export function getAuth() {
  if (instance) return instance;
  instance = buildAuth();
  return instance;
}

export class StaffAuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "StaffAuthError";
  }
}

export async function requireStaff(headers: Headers) {
  const session = await getAuth().api.getSession({ headers });
  if (!session) throw new StaffAuthError(401, "Authentication required");
  if ((session.user as { role?: string }).role !== "staff")
    throw new StaffAuthError(403, "Staff access required");
  return session;
}
