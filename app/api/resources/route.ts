import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(""),
  capacity: z.number().int().min(1).max(10000),
});

export async function GET() {
  const { data, error } = await getDb()
    .from("resources")
    .select("id, name, description, capacity")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "query_failed" }, { status: 500 });
  return NextResponse.json({ resources: data });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const { data, error } = await getDb().from("resources").insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  return NextResponse.json({ resource: data }, { status: 201 });
}
