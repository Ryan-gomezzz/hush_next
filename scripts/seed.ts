import { createClient } from "@supabase/supabase-js";

type Env = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
};

function requireEnv(env: Env, key: keyof Env): string {
  const value = env[key];
  if (!value) throw new Error(`Missing required env var: ${String(key)}`);
  return value;
}

async function main() {
  const env: Env = process.env;
  const url = requireEnv(env, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const adminEmail = env.ADMIN_EMAIL ?? "admin@hushgentle.test";
  const adminPassword = env.ADMIN_PASSWORD ?? "Admin@123!";

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Ensure admin auth user exists
  const existing = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (existing.error) throw existing.error;
  const found = existing.data.users.find((u) => u.email === adminEmail);

  const adminUser =
    found ??
    (
      await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      })
    ).data.user;

  if (!adminUser?.id) {
    throw new Error("Failed to create or fetch admin user");
  }

  // 2) Ensure public.users and profiles rows exist + role is admin
  const upsertUsers = await supabase
    .from("users")
    .upsert({ id: adminUser.id, email: adminEmail }, { onConflict: "id" })
    .select("id")
    .single();
  if (upsertUsers.error) throw upsertUsers.error;

  const upsertProfiles = await supabase
    .from("profiles")
    .upsert(
      { id: adminUser.id, role: "admin", full_name: "Hush Gentle Admin" },
      { onConflict: "id" },
    )
    .select("id, role")
    .single();
  if (upsertProfiles.error) throw upsertProfiles.error;

  console.log(
    `Seed admin OK: ${adminEmail} (role=${upsertProfiles.data.role})`,
  );

  // 3) Run SQL seed data (optional; can also be applied via SQL Editor)
  // We keep this script minimal to avoid relying on RPC/sql execution.
  // Use `db/seed.sql` / `supabase/seed.sql` for product/category/testimonial seeds.
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


