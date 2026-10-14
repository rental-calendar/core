import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await getDb()
    .from("bookings")
    .select("id, resource_id, start_date, end_date, quantity, customer_name, customer_email, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: "query_failed" }, { status: 500 });
  return NextResponse.json({ bookings: data });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.literal("cancelled"),
});

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const { error } = await getDb()
    .from("bookings")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: "update_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
