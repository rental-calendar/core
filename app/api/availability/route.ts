import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/supabase";
import { daysInMonth, remainingByDay } from "@/lib/availability";

const querySchema = z.object({
  resource: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const { resource, month } = parsed.data;
  const days = daysInMonth(month);
  const first = days[0];
  const last = days[days.length - 1];
  const db = getDb();

  const { data: res, error: resErr } = await db
    .from("resources")
    .select("capacity")
    .eq("id", resource)
    .single();
  if (resErr || !res) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: bookings, error: bErr } = await db
    .from("bookings")
    .select("start_date, end_date, quantity")
    .eq("resource_id", resource)
    .eq("status", "confirmed")
    .lte("start_date", last)
    .gt("end_date", first);
  if (bErr) return NextResponse.json({ error: "query_failed" }, { status: 500 });

  const { data: blocked, error: blErr } = await db
    .from("blocked_dates")
    .select("day")
    .eq("resource_id", resource)
    .gte("day", first)
    .lte("day", last);
  if (blErr) return NextResponse.json({ error: "query_failed" }, { status: 500 });

  const blockedSet = new Set((blocked ?? []).map((b) => b.day as string));
  const remaining = remainingByDay(res.capacity, days, bookings ?? [], blockedSet);
  return NextResponse.json({ month, capacity: res.capacity, remaining });
}
