import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { ADMIN_EMAIL } from "@/lib/admin/config";

let client: ReturnType<typeof createClient> | null = null;

function serverClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}

/**
 * Verify the Bearer token and confirm it belongs to the single admin.
 * Returns the lowercase email on success, null otherwise.
 */
export async function adminUser(req: NextRequest): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return null;
  const db = serverClient();
  if (!db) return null;
  try {
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return null;
    const email = (data.user.email ?? "").toLowerCase();
    return email === ADMIN_EMAIL.toLowerCase() ? email : null;
  } catch {
    return null;
  }
}