import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

const bookingSchema = z
  .object({
    resource_id: z.string().uuid(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    quantity: z.number().int().min(1).max(10000).default(1),
    customer_name: z.string().trim().min(1).max(200),
    customer_email: z.string().trim().email().max(320),
  })
  .refine((b) => b.end_date > b.start_date, { message: "end_date must be after start_date" });

export async function POST(req: Request) {
  const parsed = bookingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.issues }, { status: 400 });
  }
  const b = parsed.data;

  const { data: id, error } = await getDb().rpc("create_booking", {
    p_resource: b.resource_id,
    p_start: b.start_date,
    p_end: b.end_date,
    p_qty: b.quantity,
    p_name: b.customer_name,
    p_email: b.customer_email,
  });

  if (error) {
    if (error.message.includes("unavailable")) {
      return NextResponse.json({ error: "unavailable" }, { status: 409 });
    }
    if (error.message.includes("resource_not_found")) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ error: "booking_failed" }, { status: 500 });
  }

  const summary = `${b.quantity} x resource ${b.resource_id}, ${b.start_date} to ${b.end_date} (checkout day excluded)`;
  await sendEmail(
    b.customer_email,
    "Your booking is confirmed",
    `Hi ${b.customer_name},\n\nYour booking is confirmed.\n${summary}\nBooking ID: ${id}\n`,
  );
  const owner = process.env.OWNER_EMAIL;
  if (owner) {
    await sendEmail(
      owner,
      "New booking",
      `${b.customer_name} <${b.customer_email}>\n${summary}\nBooking ID: ${id}\n`,
    );
  }

  return NextResponse.json({ booking_id: id }, { status: 201 });
}
