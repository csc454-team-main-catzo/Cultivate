import type { Context, Next } from "hono";
import type { IUser } from "../models/User.js";

export async function requireAdmin(c: Context, next: Next) {
  const user = c.get("user") as IUser | undefined;
  const role = (user as unknown as { role?: string } | undefined)?.role;

  if (role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  await next();
}
