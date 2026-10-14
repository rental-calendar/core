import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

const schema = z.object({
  resource_id: z.string().uuid(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const resource = new URL(req.url).searchParams.get("resource");
  if (!resource || !z.string().uuid().safeParse(resource).success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { data, error } = await getDb()
    .from("blocked_dates")
    .select("id, day")
    .eq("resource_id", resource)
    .order("day", { ascending: true });
  if (error) return NextResponse.json({ error: "query_failed" }, { status: 500 });
  return NextResponse.json({ blocked: data });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const { error } = await getDb().from("blocked_dates").upsert(parsed.data, {
    onConflict: "resource_id,day",
  });
  if (error) return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { error } = await getDb().from("blocked_dates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
