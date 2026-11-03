import dotenv from "dotenv";
import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { DEMO_STAFF_EMAIL, DEMO_STAFF_PASSWORD } from "../src/lib/demo-staff";

dotenv.config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not configured");

const client = postgres(url, { max: 1, prepare: false });
try {
  const password = await hashPassword(DEMO_STAFF_PASSWORD);
  await client.begin(async (tx) => {
    await tx.unsafe("select pg_advisory_xact_lock(hashtextextended($1, 0))", [
      DEMO_STAFF_EMAIL,
    ]);
    const existing = await tx.unsafe<{ role: string }[]>(
      "select role from app_user where email = $1 limit 1",
      [DEMO_STAFF_EMAIL],
    );
    if (existing[0]) {
      if (existing[0].role !== "staff")
        throw new Error(
          `Existing demo account has role ${existing[0].role}; refusing to change it`,
        );
      console.log(
        "Demo staff account already exists; preserved without changing credentials.",
      );
      return;
    }
    const now = new Date();
    const userId = randomUUID();
    await tx.unsafe(
      "insert into app_user (id, name, email, email_verified, role, created_at, updated_at) values ($1, $2, $3, $4, $5, $6, $6)",
      [userId, "Demo Staff", DEMO_STAFF_EMAIL, true, "staff", now],
    );
    await tx.unsafe(
      "insert into app_account (id, account_id, provider_id, user_id, password, created_at, updated_at) values ($1, $2, $3, $2, $4, $5, $5)",
      [randomUUID(), userId, "credential", password, now],
    );
    console.log(`Created demo staff account ${DEMO_STAFF_EMAIL}.`);
  });
} finally {
  await client.end();
}
