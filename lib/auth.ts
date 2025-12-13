import { z } from "zod";

export class AuthRequiredError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class AdminRequiredError extends Error {
  constructor(message = "Admin access required") {
    super(message);
    this.name = "AdminRequiredError";
  }
}

const ProfileSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["admin", "customer"]),
});

export async function getUserOrNull(supabase: any) {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

export async function requireUser(supabase: any) {
  const user = await getUserOrNull(supabase);
  if (!user?.id) throw new AuthRequiredError();
  return user;
}

export async function getRoleOrNull(supabase: any): Promise<"admin" | "customer" | null> {
  const user = await getUserOrNull(supabase);
  if (!user?.id) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();
  if (error || !data) return null;
  const parsed = ProfileSchema.safeParse(data);
  return parsed.success ? parsed.data.role : null;
}

export async function requireAdmin(supabase: any) {
  const role = await getRoleOrNull(supabase);
  if (role !== "admin") throw new AdminRequiredError();
  return true;
}


